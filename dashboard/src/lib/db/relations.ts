import { relations } from "drizzle-orm";
import { groups, nodes, rules, configEvents, bootstrapTokens } from "./schema";

export const groupsRelations = relations(groups, ({ many }) => ({
  nodes: many(nodes),
  rules: many(rules),
  configEvents: many(configEvents),
}));

export const nodesRelations = relations(nodes, ({ one }) => ({
  group: one(groups, {
    fields: [nodes.groupId],
    references: [groups.id],
  }),
}));

export const rulesRelations = relations(rules, ({ one }) => ({
  group: one(groups, {
    fields: [rules.groupId],
    references: [groups.id],
  }),
}));

export const configEventsRelations = relations(configEvents, ({ one }) => ({
  group: one(groups, {
    fields: [configEvents.groupId],
    references: [groups.id],
  }),
}));

export const bootstrapTokensRelations = relations(bootstrapTokens, ({ one }) => ({
  node: one(nodes, {
    fields: [bootstrapTokens.nodeId],
    references: [nodes.id],
  }),
}));
