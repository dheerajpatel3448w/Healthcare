import { Memory } from 'mem0ai/oss';
import dotenv from 'dotenv';

dotenv.config();

const config = {
  telemetry: false,
  checkCompatibility: false,
  disableHistory: true,
  llm: {
    provider: "openai",
    config: {
      model: "gpt-4o-mini"
    }
  },
   historyStore: {
    provider: "supabase",
    checkCompatibility: false,
    config: {
      supabaseUrl: process.env.SUPABASE_URL || "",
      supabaseKey: process.env.SUPABASE_KEY || "",
      tableName: "memory_history"
    }
  }
,
  vectorStore: {
    provider: 'qdrant',
    checkCompatibility: false,
    config: {
      collectionName: 'memories',
      embeddingModelDims: 1536,
      host: process.env.QDRANT_HOST || 'localhost',
      port: parseInt(process.env.QDRANT_PORT || '6333'),
    },
  },
  enableGraph: true,
  graphStore: {
    checkCompatibility: false,
    provider: "neo4j",
    config: {
      url: process.env.NEO4J_URL!,
      username: process.env.NEO4J_USERNAME!,
      password: process.env.NEO4J_PASSWORD!,
      database: "neo4j",
    },
  },
 
};

export const memory = new Memory(config);