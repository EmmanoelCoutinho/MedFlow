import { supabase } from "../lib/supabaseClient";
import type {
  BotChannelBindingRow,
  BotNodeRow,
  BotOptionRow,
  BotRow,
  ChannelConnectionRow,
  DepartmentRow,
  TagRow,
  CreateBotNodeInput,
  UpdateBotNodeInput,
  CreateBotOptionInput,
  UpdateBotOptionInput,
  UpsertBotChannelBindingInput,
} from "../types/bots";

type SupabaseResult<T> =
  | { data: T; error: null }
  | { data: null; error: Error };

const asError = (error: unknown) =>
  error instanceof Error ? error : new Error(String(error));

export const botsService = {
  async validateBotBeforePublish(
    botId: string,
  ): Promise<SupabaseResult<{ ok: true }>> {
    try {
      const nodesRes = await this.listNodes(botId);
      if (nodesRes.error) return { data: null, error: nodesRes.error };

      const root =
        (nodesRes.data ?? []).find((n) => n.node_key === "root") ?? null;

      if (!root) {
        return {
          data: null,
          error: new Error(
            'Publicação bloqueada: node root (node_key="root") ausente.',
          ),
        };
      }

      if (root.node_type === "menu") {
        const optsRes = await this.listOptions(root.id);
        if (optsRes.error) return { data: null, error: optsRes.error };

        if ((optsRes.data ?? []).length === 0) {
          return {
            data: null,
            error: new Error(
              "Publicação bloqueada: root menu precisa ter ao menos 1 opção.",
            ),
          };
        }
      }

      return { data: { ok: true }, error: null };
    } catch (e) {
      return { data: null, error: asError(e) };
    }
  },

  async listBots(clinicId: string): Promise<SupabaseResult<BotRow[]>> {
    try {
      const { data, error } = await supabase
        .from("bots")
        .select("*")
        .eq("clinic_id", clinicId)
        .eq("is_deleted", false)
        .order("updated_at", { ascending: false });

      if (error) return { data: null, error: asError(error) };
      return { data: (data ?? []) as BotRow[], error: null };
    } catch (e) {
      return { data: null, error: asError(e) };
    }
  },

  async getBotById(
    clinicId: string,
    botId: string,
  ): Promise<SupabaseResult<BotRow>> {
    try {
      const { data, error } = await supabase
        .from("bots")
        .select("*")
        .eq("clinic_id", clinicId)
        .eq("id", botId)
        .maybeSingle();

      if (error) return { data: null, error: asError(error) };
      if (!data) return { data: null, error: new Error("Bot não encontrado.") };

      return { data: data as BotRow, error: null };
    } catch (e) {
      return { data: null, error: asError(e) };
    }
  },

  async createBot(payload: Partial<BotRow>): Promise<SupabaseResult<BotRow>> {
    try {
      const { data, error } = await supabase
        .from("bots")
        .insert(payload)
        .select("*")
        .single();

      if (error) return { data: null, error: asError(error) };
      return { data: data as BotRow, error: null };
    } catch (e) {
      return { data: null, error: asError(e) };
    }
  },

  async updateBot(
    clinicId: string,
    botId: string,
    payload: Partial<BotRow>,
  ): Promise<SupabaseResult<BotRow>> {
    try {
      const { data, error } = await supabase
        .from("bots")
        .update(payload)
        .eq("id", botId)
        .eq("clinic_id", clinicId)
        .select("*")
        .single();

      if (error) return { data: null, error: asError(error) };
      return { data: data as BotRow, error: null };
    } catch (e) {
      return { data: null, error: asError(e) };
    }
  },

  async softDeleteBot(
    clinicId: string,
    botId: string,
  ): Promise<SupabaseResult<BotRow>> {
    return this.updateBot(clinicId, botId, { is_deleted: true });
  },

  async duplicateBot(
    clinicId: string,
    botId: string,
  ): Promise<SupabaseResult<BotRow>> {
    try {
      const botRes = await this.getBotById(clinicId, botId);
      if (botRes.error) return botRes;

      const nodesRes = await this.listNodes(botId);
      if (nodesRes.error) return { data: null, error: nodesRes.error };

      const oldNodes = nodesRes.data ?? [];
      const oldOptionsByNodeId = new Map<string, BotOptionRow[]>();

      for (const node of oldNodes) {
        const optionsRes = await this.listOptions(node.id);
        if (optionsRes.error) return { data: null, error: optionsRes.error };
        oldOptionsByNodeId.set(node.id, optionsRes.data ?? []);
      }

      const bindingsRes = await this.listBindings(clinicId, botId);
      if (bindingsRes.error) return { data: null, error: bindingsRes.error };

      const sourceBot = botRes.data;

      const { data: createdBot, error: createBotErr } = await supabase
        .from("bots")
        .insert({
          clinic_id: clinicId,
          name: `${sourceBot.name} (cópia)`,
          description: sourceBot.description,
          status: sourceBot.status,
          type: sourceBot.type,
          published: false,
          start_message: sourceBot.start_message,
          invalid_option_message: sourceBot.invalid_option_message,
          timeout_message: sourceBot.timeout_message,
          human_handoff_enabled: sourceBot.human_handoff_enabled,
          max_invalid_attempts: sourceBot.max_invalid_attempts,
          is_deleted: false,
        })
        .select("*")
        .single();

      if (createBotErr) return { data: null, error: asError(createBotErr) };

      const newBot = createdBot as BotRow;

      const nodePayloads: CreateBotNodeInput[] = oldNodes.map((n) => ({
        bot_id: newBot.id,
        clinic_id: clinicId,
        node_key: n.node_key,
        title: n.title,
        message: n.message,
        node_type: n.node_type,
        sort_order: n.sort_order,
      }));

      const { data: createdNodes, error: createNodesErr } = await supabase
        .from("bot_nodes")
        .insert(nodePayloads)
        .select("*");

      if (createNodesErr) return { data: null, error: asError(createNodesErr) };

      const createdNodesRows = (createdNodes ?? []) as BotNodeRow[];
      const newNodeByOldNodeId = new Map<string, string>();
      const createdNodeByKey = new Map<string, BotNodeRow>();

      for (const n of createdNodesRows) {
        createdNodeByKey.set(n.node_key, n);
      }

      for (const oldNode of oldNodes) {
        const match =
          createdNodeByKey.get(oldNode.node_key) ??
          createdNodesRows.find(
            (n) =>
              n.node_key === oldNode.node_key &&
              n.sort_order === oldNode.sort_order,
          );

        if (match) {
          newNodeByOldNodeId.set(oldNode.id, match.id);
        }
      }

      const optionPayloads: CreateBotOptionInput[] = [];

      for (const [oldNodeId, oldOptions] of oldOptionsByNodeId.entries()) {
        const newNodeId = newNodeByOldNodeId.get(oldNodeId);
        if (!newNodeId) continue;

        for (const opt of oldOptions) {
          optionPayloads.push({
            bot_node_id: newNodeId,
            clinic_id: clinicId,
            option_value: opt.option_value,
            label: opt.label,
            action_type: opt.action_type,
            next_node_id: opt.next_node_id
              ? (newNodeByOldNodeId.get(opt.next_node_id) ?? null)
              : null,
            target_department_id: opt.target_department_id,
            tag_id: opt.tag_id,
            message_to_send: opt.message_to_send,
            end_session: opt.end_session,
            sort_order: opt.sort_order,
          });
        }
      }

      if (optionPayloads.length > 0) {
        const { error: createOptionsErr } = await supabase
          .from("bot_options")
          .insert(optionPayloads);

        if (createOptionsErr) {
          return { data: null, error: asError(createOptionsErr) };
        }
      }

      const bindingPayloads: UpsertBotChannelBindingInput[] = (
        bindingsRes.data ?? []
      ).map((b) => ({
        clinic_id: clinicId,
        bot_id: newBot.id,
        channel_connection_id: b.channel_connection_id,
        enabled: false,
        trigger_type: b.trigger_type,
        created_by: b.created_by ?? null,
      }));

      if (bindingPayloads.length > 0) {
        const { error: createBindingsErr } = await supabase
          .from("bot_channel_bindings")
          .insert(bindingPayloads);

        if (createBindingsErr) {
          return { data: null, error: asError(createBindingsErr) };
        }
      }

      return { data: newBot, error: null };
    } catch (e) {
      return { data: null, error: asError(e) };
    }
  },

  async listNodes(botId: string): Promise<SupabaseResult<BotNodeRow[]>> {
    try {
      const { data, error } = await supabase
        .from("bot_nodes")
        .select("*")
        .eq("bot_id", botId)
        .order("sort_order", { ascending: true });

      if (error) return { data: null, error: asError(error) };
      return { data: (data ?? []) as BotNodeRow[], error: null };
    } catch (e) {
      return { data: null, error: asError(e) };
    }
  },

  async createNode(
    payload: CreateBotNodeInput,
  ): Promise<SupabaseResult<BotNodeRow>> {
    try {
      const { data, error } = await supabase
        .from("bot_nodes")
        .insert(payload)
        .select("*")
        .single();

      if (error) return { data: null, error: asError(error) };
      return { data: data as BotNodeRow, error: null };
    } catch (e) {
      return { data: null, error: asError(e) };
    }
  },

  async updateNode(
    nodeId: string,
    payload: UpdateBotNodeInput,
  ): Promise<SupabaseResult<BotNodeRow>> {
    try {
      const { data, error } = await supabase
        .from("bot_nodes")
        .update(payload)
        .eq("id", nodeId)
        .select("*")
        .single();

      if (error) return { data: null, error: asError(error) };
      return { data: data as BotNodeRow, error: null };
    } catch (e) {
      return { data: null, error: asError(e) };
    }
  },

  async deleteNode(nodeId: string): Promise<SupabaseResult<true>> {
    try {
      const { error } = await supabase
        .from("bot_nodes")
        .delete()
        .eq("id", nodeId);

      if (error) return { data: null, error: asError(error) };
      return { data: true, error: null };
    } catch (e) {
      return { data: null, error: asError(e) };
    }
  },

  async listOptions(nodeId: string): Promise<SupabaseResult<BotOptionRow[]>> {
    try {
      const { data, error } = await supabase
        .from("bot_options")
        .select("*")
        .eq("bot_node_id", nodeId)
        .order("sort_order", { ascending: true });

      if (error) return { data: null, error: asError(error) };
      return { data: (data ?? []) as BotOptionRow[], error: null };
    } catch (e) {
      return { data: null, error: asError(e) };
    }
  },

  async createOption(
    payload: CreateBotOptionInput,
  ): Promise<SupabaseResult<BotOptionRow>> {
    try {
      const { data, error } = await supabase
        .from("bot_options")
        .insert(payload)
        .select("*")
        .single();

      if (error) return { data: null, error: asError(error) };
      return { data: data as BotOptionRow, error: null };
    } catch (e) {
      return { data: null, error: asError(e) };
    }
  },

  async updateOption(
    optionId: string,
    payload: UpdateBotOptionInput,
  ): Promise<SupabaseResult<BotOptionRow>> {
    try {
      const { data, error } = await supabase
        .from("bot_options")
        .update(payload)
        .eq("id", optionId)
        .select("*")
        .single();

      if (error) return { data: null, error: asError(error) };
      return { data: data as BotOptionRow, error: null };
    } catch (e) {
      return { data: null, error: asError(e) };
    }
  },

  async deleteOption(optionId: string): Promise<SupabaseResult<true>> {
    try {
      const { error } = await supabase
        .from("bot_options")
        .delete()
        .eq("id", optionId);

      if (error) return { data: null, error: asError(error) };
      return { data: true, error: null };
    } catch (e) {
      return { data: null, error: asError(e) };
    }
  },

  async listBindings(
    clinicId: string,
    botId: string,
  ): Promise<SupabaseResult<BotChannelBindingRow[]>> {
    try {
      const { data, error } = await supabase
        .from("bot_channel_bindings")
        .select("*")
        .eq("clinic_id", clinicId)
        .eq("bot_id", botId);

      if (error) return { data: null, error: asError(error) };
      return { data: (data ?? []) as BotChannelBindingRow[], error: null };
    } catch (e) {
      return { data: null, error: asError(e) };
    }
  },

  async upsertBinding(
    payload: UpsertBotChannelBindingInput,
  ): Promise<SupabaseResult<BotChannelBindingRow[]>> {
    try {
      const { data, error } = await supabase
        .from("bot_channel_bindings")
        .upsert(payload, {
          onConflict: "bot_id,channel_connection_id",
        })
        .select("*");

      if (error) return { data: null, error: asError(error) };
      return { data: (data ?? []) as BotChannelBindingRow[], error: null };
    } catch (e) {
      return { data: null, error: asError(e) };
    }
  },

  async deleteBinding(
    clinicId: string,
    botId: string,
    channelConnectionId: string,
  ): Promise<SupabaseResult<true>> {
    try {
      const { error } = await supabase
        .from("bot_channel_bindings")
        .delete()
        .eq("clinic_id", clinicId)
        .eq("bot_id", botId)
        .eq("channel_connection_id", channelConnectionId);

      if (error) return { data: null, error: asError(error) };
      return { data: true, error: null };
    } catch (e) {
      return { data: null, error: asError(e) };
    }
  },

  async listChannelConnections(
    clinicId: string,
  ): Promise<SupabaseResult<ChannelConnectionRow[]>> {
    try {
      const { data, error } = await supabase
        .from("channel_connections")
        .select("*")
        .eq("clinic_id", clinicId)
        .order("updated_at", { ascending: false });

      if (error) return { data: null, error: asError(error) };
      return { data: (data ?? []) as ChannelConnectionRow[], error: null };
    } catch (e) {
      return { data: null, error: asError(e) };
    }
  },

  async listDepartments(
    clinicId: string,
  ): Promise<SupabaseResult<DepartmentRow[]>> {
    try {
      const { data, error } = await supabase
        .from("departments")
        .select("*")
        .eq("clinic_id", clinicId)
        .order("name", { ascending: true });

      if (error) return { data: null, error: asError(error) };
      return { data: (data ?? []) as DepartmentRow[], error: null };
    } catch (e) {
      return { data: null, error: asError(e) };
    }
  },

  async listTags(clinicId: string): Promise<SupabaseResult<TagRow[]>> {
    try {
      const { data, error } = await supabase
        .from("tags")
        .select("*")
        .eq("clinic_id", clinicId)
        .order("name", { ascending: true });

      if (error) return { data: null, error: asError(error) };
      return { data: (data ?? []) as TagRow[], error: null };
    } catch (e) {
      return { data: null, error: asError(e) };
    }
  },
};
