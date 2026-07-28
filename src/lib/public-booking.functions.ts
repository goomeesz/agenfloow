import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export const getPublicSalon = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) =>
    z.object({ slug: z.string().trim().min(1).max(80) }).parse(input),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { getAccessStatus, signPaths } = await import("./subscription.server");

    const { data: salon } = await supabaseAdmin
      .from("salons")
      .select(
        "id, name, slug, business_type, description, address, phone, email, instagram, whatsapp, brand_color, accent_color, logo_url, cover_url, photo_url, public_enabled",
      )
      .eq("slug", data.slug)
      .eq("public_enabled", true)
      .maybeSingle();
    if (!salon) return null;

    const access = await getAccessStatus(salon.id);
    if (access.blocked) return null;

    const [services, professionals, hours] = await Promise.all([
      supabaseAdmin
        .from("services")
        .select("id, name, description, price, duration, professional_id")
        .eq("salon_id", salon.id)
        .eq("active", true)
        .order("name"),
      supabaseAdmin
        .from("professionals")
        .select("id, name, role, photo_url, start_time, end_time")
        .eq("salon_id", salon.id)
        .eq("active", true)
        .order("name"),
      supabaseAdmin
        .from("business_hours")
        .select("weekday, open_time, close_time, closed")
        .eq("salon_id", salon.id)
        .order("weekday"),
    ]);

    const { data: links } = await supabaseAdmin
      .from("professional_services")
      .select("professional_id, service_id")
      .eq("salon_id", salon.id);

    const signed = await signPaths([
      salon.logo_url,
      salon.cover_url,
      salon.photo_url,
      ...(professionals.data ?? []).map((p) => p.photo_url),
    ]);
    const url = (v: string | null) => (v ? (v.startsWith("http") ? v : (signed[v] ?? null)) : null);

    return {
      salon: {
        ...salon,
        logo_url: url(salon.logo_url),
        cover_url: url(salon.cover_url),
        photo_url: url(salon.photo_url),
      },
      services: services.data ?? [],
      professionals: (professionals.data ?? []).map((p) => ({ ...p, photo_url: url(p.photo_url) })),
      hours: hours.data ?? [],
      professionalServices: links ?? [],
    };
  });

export const getPublicSlots = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) =>
    z
      .object({
        slug: z.string().trim().min(1).max(80),
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        serviceId: z.string().uuid(),
        professionalId: z.string().uuid().nullable().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { buildSlots } = await import("./salon.server");

    const { data: salon } = await supabaseAdmin
      .from("salons")
      .select("id")
      .eq("slug", data.slug)
      .eq("public_enabled", true)
      .maybeSingle();
    if (!salon) return [];

    const { data: service } = await supabaseAdmin
      .from("services")
      .select("duration")
      .eq("id", data.serviceId)
      .eq("salon_id", salon.id)
      .maybeSingle();
    if (!service) return [];

    const weekday = new Date(`${data.date}T12:00:00`).getDay();
    const { data: hours } = await supabaseAdmin
      .from("business_hours")
      .select("open_time, close_time, closed")
      .eq("salon_id", salon.id)
      .eq("weekday", weekday)
      .maybeSingle();
    if (!hours || hours.closed || !hours.open_time || !hours.close_time) return [];

    let query = supabaseAdmin
      .from("appointments")
      .select("time, duration, professional_id")
      .eq("salon_id", salon.id)
      .eq("date", data.date)
      .neq("status", "cancelado");
    if (data.professionalId) query = query.eq("professional_id", data.professionalId);
    const { data: booked } = await query;

    return buildSlots(
      hours.open_time,
      hours.close_time,
      service.duration,
      (booked ?? []).map((b) => ({ time: b.time, duration: b.duration })),
    );
  });

export const createPublicBooking = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z
      .object({
        slug: z.string().trim().min(1).max(80),
        serviceId: z.string().uuid(),
        professionalId: z.string().uuid().nullable().optional(),
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        time: z.string().regex(/^\d{2}:\d{2}$/),
        name: z.string().trim().min(2).max(80),
        phone: z.string().trim().min(8).max(30),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: salon } = await supabaseAdmin
      .from("salons")
      .select("id")
      .eq("slug", data.slug)
      .eq("public_enabled", true)
      .maybeSingle();
    if (!salon) throw new Error("Salão indisponível para agendamento online");

    const { getAccessStatus, notify } = await import("./subscription.server");
    const access = await getAccessStatus(salon.id);
    if (access.blocked) throw new Error("Agendamento online indisponível no momento.");

    const { data: service } = await supabaseAdmin
      .from("services")
      .select("id, name, price, duration, professional_id")
      .eq("id", data.serviceId)
      .eq("salon_id", salon.id)
      .eq("active", true)
      .maybeSingle();
    if (!service) throw new Error("Serviço indisponível");

    const professionalId = data.professionalId ?? service.professional_id;
    let professionalName: string | null = null;
    if (professionalId) {
      const { data: pro } = await supabaseAdmin
        .from("professionals")
        .select("name")
        .eq("id", professionalId)
        .eq("salon_id", salon.id)
        .maybeSingle();
      if (!pro) throw new Error("Profissional indisponível");
      professionalName = pro.name;
    }

    const { data: clash } = await supabaseAdmin
      .from("appointments")
      .select("id")
      .eq("salon_id", salon.id)
      .eq("date", data.date)
      .eq("time", data.time)
      .neq("status", "cancelado")
      .eq("professional_id", professionalId ?? "")
      .maybeSingle();
    if (clash) throw new Error("Esse horário acabou de ser preenchido. Escolha outro.");

    let clientId: string | null = null;
    const { data: existingClient } = await supabaseAdmin
      .from("clients")
      .select("id")
      .eq("salon_id", salon.id)
      .eq("phone", data.phone)
      .maybeSingle();
    clientId = existingClient?.id ?? null;
    if (!clientId) {
      const { data: created } = await supabaseAdmin
        .from("clients")
        .insert({ salon_id: salon.id, name: data.name, phone: data.phone })
        .select("id")
        .single();
      clientId = created?.id ?? null;
    }

    const { error } = await supabaseAdmin.from("appointments").insert({
      salon_id: salon.id,
      client_id: clientId,
      client_name: data.name,
      client_phone: data.phone,
      service_id: service.id,
      service_name: service.name,
      professional_id: professionalId ?? null,
      professional_name: professionalName,
      date: data.date,
      time: data.time,
      duration: service.duration,
      price: service.price,
      status: "agendado",
      source: "publico",
    });
    if (error) throw new Error(error.message);

    await notify(salon.id, {
      type: "appointment_online",
      title: "Novo agendamento pelo link",
      message: `${data.name} · ${service.name} · ${data.date} às ${data.time}`,
      link: "/agenda",
    });

    return {
      ok: true,
      serviceName: service.name,
      duration: service.duration,
      price: Number(service.price),
      professionalName,
    };
  });