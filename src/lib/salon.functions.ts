import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";

export const getMySalon = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: memberships } = await context.supabase
      .from("salon_members")
      .select("salon_id")
      .eq("user_id", context.userId)
      .limit(1);

    const salonId = memberships?.[0]?.salon_id;
    if (!salonId) return null;

    const { data: salon } = await context.supabase
      .from("salons")
      .select("*")
      .eq("id", salonId)
      .maybeSingle();

    const { data: roles } = await context.supabase
      .from("member_roles")
      .select("role")
      .eq("salon_id", salonId)
      .eq("user_id", context.userId);

    return salon ? { ...salon, roles: (roles ?? []).map((r) => r.role) } : null;
  });

export const createSalon = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        name: z.string().trim().min(2).max(80),
        businessType: z.string().trim().max(80).optional(),
        ownerName: z.string().trim().max(80).optional(),
        phone: z.string().trim().max(30).optional(),
        address: z.string().trim().max(200).optional(),
        instagram: z.string().trim().max(60).optional(),
        brandColor: z.string().trim().max(9).optional(),
        hours: z
          .array(
            z.object({
              weekday: z.number().int().min(0).max(6),
              open: z.string().max(5).nullable(),
              close: z.string().max(5).nullable(),
              closed: z.boolean(),
            }),
          )
          .max(7)
          .optional(),
        services: z.array(z.string().trim().min(1).max(60)).max(30).optional(),
        professionals: z.array(z.string().trim().min(1).max(60)).max(30).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { slugify, initialsOf, DEFAULT_SERVICES } = await import("./salon.server");

    const existing = await supabaseAdmin
      .from("salon_members")
      .select("salon_id")
      .eq("user_id", context.userId)
      .limit(1);
    if (existing.data?.length) return { salonId: existing.data[0].salon_id };

    let slug = slugify(data.name);
    const taken = await supabaseAdmin.from("salons").select("slug").eq("slug", slug).maybeSingle();
    if (taken.data) slug = `${slug}-${Math.random().toString(36).slice(2, 6)}`;

    const { data: salon, error } = await supabaseAdmin
      .from("salons")
      .insert({
        owner_id: context.userId,
        name: data.name,
        business_type: data.businessType || null,
        owner_name: data.ownerName || null,
        phone: data.phone || null,
        whatsapp: data.phone ? `55${data.phone.replace(/\D/g, "")}` : null,
        address: data.address || null,
        instagram: data.instagram || null,
        brand_color: data.brandColor || "#d94f80",
        slug,
      })
      .select("id, slug")
      .single();
    if (error || !salon) throw new Error(error?.message ?? "Não foi possível criar o salão");

    await supabaseAdmin.from("salon_members").insert({ salon_id: salon.id, user_id: context.userId });
    await supabaseAdmin
      .from("member_roles")
      .insert({ salon_id: salon.id, user_id: context.userId, role: "dono" });

    // Free 7-day trial starts when the first business is created.
    const trialStart = new Date();
    const trialEnd = new Date(trialStart.getTime() + 7 * 24 * 60 * 60 * 1000);
    await supabaseAdmin.from("subscriptions").insert({
      salon_id: salon.id,
      trial_started_at: trialStart.toISOString(),
      trial_ends_at: trialEnd.toISOString(),
      status: "trial",
      plan: "pro",
      price_cents: 9700,
    });
    await supabaseAdmin.from("notifications").insert({
      salon_id: salon.id,
      type: "trial",
      title: "Seu teste gratuito começou",
      message: "Você tem 7 dias para explorar o AgenFloow Pro.",
      link: "/assinatura",
    });

    const hours =
      data.hours ??
      [0, 1, 2, 3, 4, 5, 6].map((weekday) => ({
        weekday,
        open: "09:00",
        close: "19:00",
        closed: weekday === 0,
      }));
    await supabaseAdmin.from("business_hours").insert(
      hours.map((h) => ({
        salon_id: salon.id,
        weekday: h.weekday,
        open_time: h.closed ? null : h.open,
        close_time: h.closed ? null : h.close,
        closed: h.closed,
      })),
    );

    const pros = (data.professionals ?? []).filter(Boolean);
    let firstProId: string | null = null;
    if (pros.length) {
      const { data: inserted } = await supabaseAdmin
        .from("professionals")
        .insert(pros.map((name) => ({ salon_id: salon.id, name, initials: initialsOf(name) })))
        .select("id");
      firstProId = inserted?.[0]?.id ?? null;
    } else if (data.ownerName) {
      const { data: inserted } = await supabaseAdmin
        .from("professionals")
        .insert({
          salon_id: salon.id,
          user_id: context.userId,
          name: data.ownerName,
          role: "Proprietário(a)",
          initials: initialsOf(data.ownerName),
        })
        .select("id");
      firstProId = inserted?.[0]?.id ?? null;
    }

    const custom = (data.services ?? []).filter(Boolean);
    const rows = custom.length
      ? custom.map((name) => ({ name, description: null as string | null, price: 0, duration: 60 }))
      : DEFAULT_SERVICES.map((s) => ({ ...s, description: s.description as string | null }));
    await supabaseAdmin.from("services").insert(
      rows.map((s) => ({
        salon_id: salon.id,
        professional_id: firstProId,
        name: s.name,
        description: s.description,
        price: s.price,
        duration: s.duration,
      })),
    );

    return { salonId: salon.id, slug: salon.slug };
  });

export const updateSalon = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        salonId: z.string().uuid(),
        name: z.string().trim().min(2).max(80).optional(),
        businessType: z.string().trim().max(80).nullable().optional(),
        ownerName: z.string().trim().max(80).nullable().optional(),
        address: z.string().trim().max(200).nullable().optional(),
        phone: z.string().trim().max(30).nullable().optional(),
        instagram: z.string().trim().max(60).nullable().optional(),
        brandColor: z.string().trim().max(9).optional(),
        publicEnabled: z.boolean().optional(),
        description: z.string().trim().max(500).nullable().optional(),
        email: z.string().trim().max(120).nullable().optional(),
        accentColor: z.string().trim().max(9).optional(),
        logoUrl: z.string().trim().max(300).nullable().optional(),
        coverUrl: z.string().trim().max(300).nullable().optional(),
        photoUrl: z.string().trim().max(300).nullable().optional(),
        whatsapp: z.string().trim().max(30).nullable().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { salonId, ...rest } = data;
    type SalonPatch = Database["public"]["Tables"]["salons"]["Update"];
    const patch: SalonPatch = { updated_at: new Date().toISOString() };
    if (rest.name !== undefined) patch.name = rest.name;
    if (rest.businessType !== undefined) patch.business_type = rest.businessType;
    if (rest.ownerName !== undefined) patch.owner_name = rest.ownerName;
    if (rest.address !== undefined) patch.address = rest.address;
    if (rest.phone !== undefined) {
      patch.phone = rest.phone;
      patch.whatsapp = rest.phone ? `55${rest.phone.replace(/\D/g, "")}` : null;
    }
    if (rest.whatsapp !== undefined) {
      patch.whatsapp = rest.whatsapp ? rest.whatsapp.replace(/\D/g, "") : null;
    }
    if (rest.instagram !== undefined) patch.instagram = rest.instagram;
    if (rest.brandColor !== undefined) patch.brand_color = rest.brandColor;
    if (rest.publicEnabled !== undefined) patch.public_enabled = rest.publicEnabled;
    if (rest.description !== undefined) patch.description = rest.description;
    if (rest.email !== undefined) patch.email = rest.email;
    if (rest.accentColor !== undefined) patch.accent_color = rest.accentColor;
    if (rest.logoUrl !== undefined) patch.logo_url = rest.logoUrl;
    if (rest.coverUrl !== undefined) patch.cover_url = rest.coverUrl;
    if (rest.photoUrl !== undefined) patch.photo_url = rest.photoUrl;

    const { error } = await context.supabase.from("salons").update(patch).eq("id", salonId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const getSalonData = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ salonId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const [services, professionals, clients, appointments, hours] = await Promise.all([
      context.supabase.from("services").select("*").eq("salon_id", data.salonId).order("name"),
      context.supabase.from("professionals").select("*").eq("salon_id", data.salonId).order("name"),
      context.supabase.from("clients").select("*").eq("salon_id", data.salonId).order("name"),
      context.supabase
        .from("appointments")
        .select("*")
        .eq("salon_id", data.salonId)
        .order("date")
        .order("time"),
      context.supabase.from("business_hours").select("*").eq("salon_id", data.salonId).order("weekday"),
    ]);

    const { data: links } = await context.supabase
      .from("professional_services")
      .select("professional_id, service_id")
      .eq("salon_id", data.salonId);

    return {
      services: services.data ?? [],
      professionals: professionals.data ?? [],
      clients: clients.data ?? [],
      appointments: appointments.data ?? [],
      hours: hours.data ?? [],
      professionalServices: links ?? [],
    };
  });

export const saveService = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        id: z.string().uuid().optional(),
        salonId: z.string().uuid(),
        name: z.string().trim().min(1).max(80),
        description: z.string().trim().max(200).nullable().optional(),
        price: z.number().min(0).max(100000),
        duration: z.number().int().min(5).max(600),
        professionalId: z.string().uuid().nullable().optional(),
        active: z.boolean().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { requireActiveAccess } = await import("./subscription.server");
    await requireActiveAccess(data.salonId);
    const row = {
      salon_id: data.salonId,
      name: data.name,
      description: data.description ?? null,
      price: data.price,
      duration: data.duration,
      professional_id: data.professionalId ?? null,
      active: data.active ?? true,
    };
    const q = data.id
      ? context.supabase.from("services").update(row).eq("id", data.id)
      : context.supabase.from("services").insert(row);
    const { error } = await q;
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const setServiceActive = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ id: z.string().uuid(), active: z.boolean() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("services")
      .update({ active: data.active })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const saveProfessional = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        id: z.string().uuid().optional(),
        salonId: z.string().uuid(),
        name: z.string().trim().min(2).max(80),
        role: z.string().trim().max(80).nullable().optional(),
        days: z.string().trim().max(60).nullable().optional(),
        startTime: z.string().trim().max(5).nullable().optional(),
        endTime: z.string().trim().max(5).nullable().optional(),
        breakStart: z.string().trim().max(5).nullable().optional(),
        breakEnd: z.string().trim().max(5).nullable().optional(),
        photoUrl: z.string().trim().max(300).nullable().optional(),
        active: z.boolean().optional(),
        serviceIds: z.array(z.string().uuid()).max(60).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { initialsOf } = await import("./salon.server");
    const { requireActiveAccess } = await import("./subscription.server");
    await requireActiveAccess(data.salonId);

    const row = {
      salon_id: data.salonId,
      name: data.name,
      role: data.role ?? null,
      days: data.days ?? null,
      start_time: data.startTime || null,
      end_time: data.endTime || null,
      break_start: data.breakStart || null,
      break_end: data.breakEnd || null,
      photo_url: data.photoUrl ?? null,
      active: data.active ?? true,
      initials: initialsOf(data.name),
    };

    let professionalId = data.id ?? null;
    if (professionalId) {
      const { error } = await context.supabase
        .from("professionals")
        .update(row)
        .eq("id", professionalId)
        .eq("salon_id", data.salonId);
      if (error) throw new Error(error.message);
    } else {
      const { data: created, error } = await context.supabase
        .from("professionals")
        .insert(row)
        .select("id")
        .single();
      if (error) throw new Error(error.message);
      professionalId = created.id;
    }

    if (data.serviceIds && professionalId) {
      await context.supabase
        .from("professional_services")
        .delete()
        .eq("professional_id", professionalId);
      if (data.serviceIds.length) {
        await context.supabase.from("professional_services").insert(
          data.serviceIds.map((serviceId) => ({
            salon_id: data.salonId,
            professional_id: professionalId as string,
            service_id: serviceId,
          })),
        );
      }
    }

    return { ok: true, id: professionalId };
  });

export const setProfessionalActive = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ id: z.string().uuid(), active: z.boolean() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("professionals")
      .update({ active: data.active })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteProfessional = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("professionals").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const saveClient = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        id: z.string().uuid().optional(),
        salonId: z.string().uuid(),
        name: z.string().trim().min(2).max(80),
        phone: z.string().trim().max(30).nullable().optional(),
        whatsapp: z.string().trim().max(30).nullable().optional(),
        email: z.string().trim().max(120).nullable().optional(),
        notes: z.string().trim().max(600).nullable().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { requireActiveAccess } = await import("./subscription.server");
    await requireActiveAccess(data.salonId);

    const row = {
      salon_id: data.salonId,
      name: data.name,
      phone: data.phone ?? null,
      whatsapp: data.whatsapp ? data.whatsapp.replace(/\D/g, "") : null,
      email: data.email ?? null,
      notes: data.notes ?? null,
    };
    const q = data.id
      ? context.supabase.from("clients").update(row).eq("id", data.id).eq("salon_id", data.salonId)
      : context.supabase.from("clients").insert(row);
    const { error } = await q;
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const createAppointment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        salonId: z.string().uuid(),
        clientName: z.string().trim().min(2).max(80),
        clientPhone: z.string().trim().max(30).optional(),
        serviceId: z.string().uuid(),
        professionalId: z.string().uuid().nullable().optional(),
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        time: z.string().regex(/^\d{2}:\d{2}$/),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { requireActiveAccess, notify } = await import("./subscription.server");
    await requireActiveAccess(data.salonId);

    const { data: service } = await context.supabase
      .from("services")
      .select("id, name, price, duration, professional_id")
      .eq("id", data.serviceId)
      .eq("salon_id", data.salonId)
      .maybeSingle();
    if (!service) throw new Error("Serviço não encontrado");

    const professionalId = data.professionalId ?? service.professional_id;
    let professionalName: string | null = null;
    if (professionalId) {
      const { data: pro } = await context.supabase
        .from("professionals")
        .select("name")
        .eq("id", professionalId)
        .maybeSingle();
      professionalName = pro?.name ?? null;
    }

    let clientId: string | null = null;
    if (data.clientPhone) {
      const { data: existing } = await context.supabase
        .from("clients")
        .select("id")
        .eq("salon_id", data.salonId)
        .eq("phone", data.clientPhone)
        .maybeSingle();
      clientId = existing?.id ?? null;
    }
    if (!clientId) {
      const { data: created } = await context.supabase
        .from("clients")
        .insert({ salon_id: data.salonId, name: data.clientName, phone: data.clientPhone ?? null })
        .select("id")
        .single();
      clientId = created?.id ?? null;
    }

    const { error } = await context.supabase.from("appointments").insert({
      salon_id: data.salonId,
      client_id: clientId,
      client_name: data.clientName,
      client_phone: data.clientPhone ?? null,
      service_id: service.id,
      service_name: service.name,
      professional_id: professionalId ?? null,
      professional_name: professionalName,
      date: data.date,
      time: data.time,
      duration: service.duration,
      price: service.price,
      status: "confirmado",
      source: "interno",
    });
    if (error) throw new Error(error.message);

    await notify(data.salonId, {
      type: "appointment_created",
      title: "Novo agendamento",
      message: `${data.clientName} · ${service.name} · ${data.date} às ${data.time}`,
      link: "/agenda",
    });
    return { ok: true };
  });

export const setAppointmentStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        status: z.enum([
          "agendado",
          "confirmado",
          "em_atendimento",
          "concluido",
          "cancelado",
          "nao_compareceu",
        ]),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: appointment } = await context.supabase
      .from("appointments")
      .select("salon_id, client_name, service_name, date, time")
      .eq("id", data.id)
      .maybeSingle();

    const { error } = await context.supabase
      .from("appointments")
      .update({ status: data.status })
      .eq("id", data.id);
    if (error) throw new Error(error.message);

    if (appointment && (data.status === "cancelado" || data.status === "nao_compareceu")) {
      const { notify } = await import("./subscription.server");
      await notify(appointment.salon_id, {
        type: data.status === "cancelado" ? "appointment_canceled" : "appointment_no_show",
        title: data.status === "cancelado" ? "Agendamento cancelado" : "Cliente não compareceu",
        message: `${appointment.client_name} · ${appointment.service_name} · ${appointment.date} às ${appointment.time}`,
        link: "/agenda",
      });
    }
    return { ok: true };
  });

export const saveBusinessHours = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        salonId: z.string().uuid(),
        hours: z
          .array(
            z.object({
              weekday: z.number().int().min(0).max(6),
              open: z.string().max(5).nullable(),
              close: z.string().max(5).nullable(),
              closed: z.boolean(),
            }),
          )
          .max(7),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await context.supabase.from("business_hours").delete().eq("salon_id", data.salonId);
    const { error } = await context.supabase.from("business_hours").insert(
      data.hours.map((h) => ({
        salon_id: data.salonId,
        weekday: h.weekday,
        open_time: h.closed ? null : h.open,
        close_time: h.closed ? null : h.close,
        closed: h.closed,
      })),
    );
    if (error) throw new Error(error.message);
    return { ok: true };
  });