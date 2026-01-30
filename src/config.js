import "dotenv/config";

export const config = {
  publicMode: process.env.PUBLIC_MODE === "true" || true,
  ephemeral: parseInt(process.env.EPHEMERAL_EXPIRATION) || 86400,
  owner: process.env.OWNER_NUMBER || "628882611841",
  ownerName: process.env.OWNER_NAME || "Irwan",
  prefix: new RegExp("^[°•π÷×¶∆£¢€¥®™+✓_=|/~!?@#%^&.©^]"),
  autoReadStory: process.env.AUTO_READ_STORY === "true" || true,
  autoReactStory: process.env.AUTO_REACT_STORY === "true" || true,
  reactEmote: process.env.REACT_EMOTE || "🗿,🔥,✨,🙌,👍",
  anticall: process.env.ANTICALL === "true" || true,
  group: {
    antilink: process.env.ANTILINK === "true" || false,
    welcome: process.env.WELCOME === "true" || true,
  },
};
