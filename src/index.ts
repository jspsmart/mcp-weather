#!/usr/bin/env node

/**
 * This is a template MCP server that implements a simple notes system.
 * It demonstrates core MCP concepts like resources and tools by allowing:
 * - Listing notes as resources
 * - Reading individual notes
 * - Creating new notes via a tool
 * - Summarizing all notes via a prompt
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  ReadResourceRequestSchema,
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

import { FlomoClient, WeatherClient } from "./clientUtil.js";
/**
 * Type alias for a note object.
 */
type Note = { title: string, content: string };

/**
 * Simple in-memory storage for notes.
 * In a real implementation, this would likely be backed by a database.
 */
const notes: { [id: string]: Note } = {
  "1": { title: "First Note", content: "This is note 1" },
  "2": { title: "Second Note", content: "This is note 2" }
};

/**
 * Collection of prompts that provide precise instructions for using the tools.
 */
interface MessageContent {
  type: string;
  text: string;
}

interface PromptMessage {
  role: string;
  content: MessageContent;
}

interface Prompt {
  name: string;
  description: string;
  messages: PromptMessage[];
}

const prompts: { [name: string]: Prompt } = {
  "tool_usage": {
    name: "tool_usage",
    description: "Provides precise instructions for using the available tools",
    messages: [
      {
        role: "user",
        content: {
          type: "text",
          text: `You are an assistant that helps users interact with a system that has two tools:

1. write_note: Used to write notes to Flomo
   - Input: { content: string }
   - Example: { "content": "Today's meeting notes" }
   - Usage: Use this tool when you need to record information or save notes.

2. query_weather: Used to query weather information for specific cities
   - Input: { city: string }
   - Supported cities: 哈尔滨, 三亚, 北京, 上海, 广州, 深圳, 成都, 杭州, 重庆, 西安, 武汉
   - Example: { "city": "北京" }
   - Usage: Use this tool when users ask for weather information about supported cities.

For each tool call, ensure you provide the exact parameters required in the correct format.`
        }
      }
    ]
  },
  "weather_tool_guide": {
    name: "weather_tool_guide",
    description: "Detailed guide for using the weather query tool",
    messages: [
      {
        role: "user",
        content: {
          type: "text",
          text: `The query_weather tool allows you to get current weather information for specific Chinese cities.

**Supported Cities:**
- 哈尔滨 (Harbin)
- 三亚 (Sanya)
- 北京 (Beijing)
- 上海 (Shanghai)
- 广州 (Guangzhou)
- 深圳 (Shenzhen)
- 成都 (Chengdu)
- 杭州 (Hangzhou)
- 重庆 (Chongqing)
- 西安 (Xi'an)
- 武汉 (Wuhan)

**Usage Example:**
{"toolcall": {"thought": "User wants to know the weather in Beijing", "name": "query_weather", "params": {"city": "北京"}}}

**Response Format:**
The tool returns current temperature, wind speed, and timestamp for the requested city.`
        }
      }
    ]
  },
  "note_tool_guide": {
    name: "note_tool_guide",
    description: "Detailed guide for using the note writing tool",
    messages: [
      {
        role: "user",
        content: {
          type: "text",
          text: `The write_note tool allows you to write notes to Flomo, a note-taking service.

**Usage Example:**
{"toolcall": {"thought": "User wants to save a meeting note", "name": "write_note", "params": {"content": "Meeting with team at 3 PM to discuss project progress"}}}

**Response Format:**
The tool returns a success message with the result from Flomo.`
        }
      }
    ]
  }
};

/**
 * Create an MCP server with capabilities for resources (to list/read notes),
 * tools (to create new notes), and prompts (to summarize notes).
 */
const server = new Server(
  {
    name: "test-mcp",
    version: "0.1.0",
  },
  {
    capabilities: {
      resources: {
        listChanged: true,
        templates: {
          listChanged: true
        }
      },
      tools: {},
      prompts: {
        listChanged: true
      },
    },
  }
);

/**
 * Handler that lists available tools.
 * Exposes a single "create_note" tool that lets clients create new notes.
 */
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "write_note",
        description: "Write a new note",
        inputSchema: {
          type: "object",
          properties: {
            content: {
              type: "string",
              description: "Text content of the note"
            }
          },
          required: ["content"]
        }
      },
      {
        name: "query_weather",
        description: "Query the weather",
        inputSchema: {
          type: "object",
          properties: {
            city: {
              type: "string",
              description: "The City of the weather query"
            }
          },
          required: ["city"]
        }
      }
    ]
  };
});

/**
 * Handler that lists available resources.
 * Exposes notes as resources that can be read.
 */
server.setRequestHandler(ListResourcesRequestSchema, async () => {
  console.error("*******1*********-listResources-");
  return {
    resources: Object.entries(notes).map(([id, note]) => ({
      uri: `/notes/${id}`,
      name: note.title,
      description: note.content
    }))
  };
});

/**
 * Handler that reads a specific resource by URI.
 * Returns the content of a note.
 */
server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  console.error("*******2*********-readResource-");
  const resourceUri = request.params.uri;
  
  if (!resourceUri || typeof resourceUri !== 'string') {
    throw new Error(`Invalid resource URI: "${resourceUri}"`);
  }
  
  // Extract resource ID from URI (e.g., /notes/1 -> 1)
  const resourceId = resourceUri.replace(/^\/notes\//, '');
  const note = notes[resourceId];
  
  if (!note) {
    throw new Error(`Resource with URI "${resourceUri}" not found`);
  }
  
  return {
    contents: [
      {
        uri: resourceUri,
        mimeType: "text/plain",
        text: `${note.title}: ${note.content}`
      }
    ]
  };
});

/**
 * Handler that lists available prompts.
 * Exposes prompts that provide precise instructions for using the tools.
 */
server.setRequestHandler(ListPromptsRequestSchema, async () => {
  return {
    prompts: Object.values(prompts).map(prompt => ({
      name: prompt.name,
      description: prompt.description
    }))
  };
});

/**
 * Handler that retrieves a specific prompt by name.
 */
server.setRequestHandler(GetPromptRequestSchema, async (request) => {
  const promptName = request.params.name;
  
  if (!promptName || typeof promptName !== 'string') {
    throw new Error(`Invalid prompt name: "${promptName}"`);
  }
  
  const prompt = prompts[promptName];
  
  if (!prompt) {
    throw new Error(`Prompt with name "${promptName}" not found`);
  }
  
  // Return correct structure according to MCP spec
  return {
    description: prompt.description,
    messages: prompt.messages
  };
});

/**
 * Handler for the create_note tool.
 * Creates a new note with the provided title and content, and returns success message.
 */
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  switch (request.params.name) {
    case "write_note": {
      const content = String(request.params.arguments?.content);
      if (!content) {
        throw new Error("Content is required");
      }

      const apiUrl = "https://flomoapp.com/iwh/MjY4NTU3NQ/b3a150f427dfaa7924b26f68539db56b/";
      const flomoClient = new FlomoClient({ apiUrl });
      const result = await flomoClient.writeNote({ content });

      return {
        content: [{
          type: "text",
          text: `Write note to flomo success: ${JSON.stringify(result)}`
        }]
      };
    }
    case "query_weather": {
      const city = String(request.params.arguments?.city);
      if (!city) {
        throw new Error("City is required");
      }

      const cityCoordinates: Record<string, { lat: number; lon: number }> = {
        '哈尔滨': { lat: 45.75, lon: 126.65 },
        '三亚': { lat: 18.25, lon: 109.51 },
        '北京': { lat: 39.90, lon: 116.41 },
        '上海': { lat: 31.23, lon: 121.47 },
        '广州': { lat: 23.13, lon: 113.26 },
        '深圳': { lat: 22.54, lon: 114.06 },
        '成都': { lat: 30.57, lon: 104.07 },
        '杭州': { lat: 30.27, lon: 120.16 },
        '重庆': { lat: 29.56, lon: 106.55 },
        '西安': { lat: 34.27, lon: 108.93 },
        '武汉': { lat: 30.59, lon: 114.30 }
      };

      // 获取城市经纬度，默认使用北京坐标
      const coords = cityCoordinates[city] || { lat: 39.90, lon: 116.41 };
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${coords.lat}&longitude=${coords.lon}&current_weather=true&hourly=temperature_2m,precipitation`;
      const weatherClient = new WeatherClient({ apiUrl: url });
      const result = await weatherClient.getWeather({ city });

      return {
        content: [{
          type: "text",
          text: `The weather report is: ${JSON.stringify(result)}`
        }]
      };
    }

    default:
      throw new Error("Unknown tool");
  }
});

/**
 * Start the server using stdio transport.
 * This allows the server to communicate via standard input/output streams.
 */
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  console.error("Server error:", error);
  process.exit(1);
});
