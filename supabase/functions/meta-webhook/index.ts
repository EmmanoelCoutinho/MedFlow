// deno-lint-ignore-file
// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SECRET_KEY")! // ✅ usa a nova secret key
);

serve(async (req) => {
  try {
    const url = new URL(req.url);

    // 1️⃣ GET — Verificação do webhook pela Meta
    if (req.method === "GET") {
      const mode = url.searchParams.get("hub.mode");
      const token = url.searchParams.get("hub.verify_token");
      const challenge = url.searchParams.get("hub.challenge");

      if (mode === "subscribe" && token === Deno.env.get("META_VERIFY_TOKEN")) {
        console.log("✅ Webhook verificado com sucesso!");
        return new Response(challenge, { status: 200 });
      }

      return new Response("Erro de verificação", { status: 403 });
    }

    // 2️⃣ POST — Recebimento de mensagens
    if (req.method === "POST") {
      const body = await req.json();

      for (const entry of body.entry ?? []) {
        for (const change of entry.changes ?? []) {
          const messages = change.value?.messages;
          const contacts = change.value?.contacts;
          if (!messages || !contacts) continue;

          const contact = contacts[0];
          const waId = contact.wa_id;
          const name = contact.profile?.name;

          for (const msg of messages) {
            const messageId = msg.id;
            const timestamp = new Date(Number(msg.timestamp) * 1000);
            const text = msg.text?.body ?? null;
            const type = msg.type ?? "text";
            const payload = msg ?? null;
            const caption =
              msg.text?.body ??
              msg.image?.caption ??
              msg.document?.caption ??
              null;

            // 🧩 1. Upsert do contato
            const { data: contactData, error: contactError } = await supabase
              .from("contacts")
              .upsert(
                {
                  meta_contact_id: waId,
                  name,
                  phone: waId,
                  last_seen_at: timestamp,
                },
                { onConflict: "meta_contact_id" }
              )
              .select()
              .single();

            if (contactError) throw contactError;

            // 🧩 2. Buscar ou criar conversa
            let { data: conversation } = await supabase
              .from("conversations")
              .select("*")
              .eq("contact_id", contactData.id)
              .eq("status", "open")
              .maybeSingle();

            if (!conversation) {
              const { data: newConv, error: convError } = await supabase
                .from("conversations")
                .insert({
                  contact_id: contactData.id,
                  status: "open",
                  channel: "whatsapp",
                  assigned_user_id: null,
                  last_message_at: timestamp,
                })
                .select()
                .single();
              if (convError) throw convError;
              conversation = newConv;
            }

            // 🧩 3. Inserir mensagem
            const { error: msgError } = await supabase
              .from("messages")
              .upsert({
                meta_message_id: messageId,
                conversation_id: conversation.id,
                direction: "inbound",
                type,
                sender: waId,
                text: text ?? caption,
                payload,
                sent_at: timestamp,
              });
            if (msgError) throw msgError;

            // 🧩 4. Atualizar last_message_at
            await supabase
              .from("conversations")
              .update({ last_message_at: timestamp })
              .eq("id", conversation.id);
          }
        }
      }

      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response("Method not allowed", { status: 405 });
  } catch (err) {
    console.error("❌ Erro no webhook Meta:", err);
    return new Response("Internal error", { status: 500 });
  }
});
