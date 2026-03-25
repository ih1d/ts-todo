import "dotenv/config";
import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import prisma from "./db.js";
import { Anthropic } from "@anthropic-ai/sdk";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();  // app must be defined first
const PORT = 3000;
app.use(express.json());

const JWT_SECRET = process.env.JWT_SECRET;
const anthropic = new Anthropic ({ apiKey: process.env.ANTHROPIC_API_KEY });

/**** AUTH MIDDLEWARE ****/
const authenticate = (req: any, res: any, next: any) => {
    const token = req.headers.authorization?.split(" ")[1];
    if(!token) return res.status(401).json({ error: "Unauthorized" });
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch {
        res.status(401).json({ error: "Invalid token" });
    }
};
/**** AUTH MIDDLEWARE ****/

// Auth
app.post("/signup", async (req, res) => {
    const { email, password, name } = req.body;
    const hashed = await bcrypt.hash(password, 10);
    try {
        const user = await prisma.user.create({
            data: { email, password: hashed, name },
        });
        const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET);
        res.json({ token, user: { id: user.id, email: user.email, name: user.name } });
    } catch {
        res.status(400).json({ error: "Email already exists!" });
    }
});

app.post("/login", async (req, res) => {
    const { email, password } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });
    if(!user) return res.status(400).json({ error: "Invalid credentials" });
    const valid = await bcrypt.compare(password, user.password);
    if(!valid) return res.status(400).json({ error: "Invalid credentials" });
    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET);
    res.json({ token, user: { id: user.id, email: user.email, name: user.name } });
});

// Todos Protected
app.get("/todos", authenticate, async (req, res) => {
    const todos = await prisma.todo.findMany({
        where: { userId: req.user.id },
        orderBy: { createdAt: "desc" },
    });
    res.json(todos);
});


app.post("/todos", authenticate, async (req, res) => {
    const { title, description, priority, dueDate } = req.body;
    const userId = req.user.id;
    const todo = await prisma.todo.create({
        data: { title, description, priority, dueDate, userId }
    });
    res.json(todo);
});

app.patch("/todos/:id/complete", authenticate, async (req, res) => {
    const todo = await prisma.todo.update({
        where: { id: req.params.id },
        data: { completed: true }
    });
    res.json(todo);
});

app.delete("/todos/:id", authenticate, async (req, res) => {
    await prisma.todo.delete({ where: { id: req.params.id } });
    res.json({ message: "Deleted" });
});

app.post("/chat", authenticate, async (req, res) => {
    const { message } = req.body;
    const userId = req.user.id;

    const tools: Anthropic.Tool[] = [
        {
            name: "get_todos",
            description: "Get all todos from current user",
            input_schema: { type: "object", properties: {}, required: [] },
        },
        {
            name: "create_todo",
            description: "Create a new todo for the user",
            input_schema: {
                type: "object",
                properties: {
                    title: { type: "string", description: "Title of the todo" },
                    description: { type: "string", description: "Optional description" },
                    priority: { type: "string", enum: ["low", "medium", "high"] },
                    dueDate: { type: "string", description: "ISO date string, optional" },
                },
                required: ["title"],
            },
        },
        {
            name: "complete_todo",
            description: "Mark a todo as completed",
            input_schema: {
                type: "object",
                properties: {
                    id: { type: "string", description: "The todo ID" },
                },
                required: ["id"],
            },
        },
        {
            name: "delete_todo",
            description: "Delete a todo",
            input_schema: {
                type: "object",
                properties: { 
                    id: { type: "string", description: "The todo ID" }, 
                },
                required: ["id"],
            },
        },
    ];

  async function executeTool(name: string, input: any) {
      switch (name) {
          case "get_todos":
              return await prisma.todo.findMany({ where: { userId } });
          case "create_todo":
              return await prisma.todo.create({
              data: { ...input, userId },
          });
          case "complete_todo":
              return await prisma.todo.update({
              where: { id: input.id },
              data: { completed: true },
          });
          case "delete_todo":
              return await prisma.todo.delete({ where: { id: input.id } });
          default:
              return { error: "Unknown tool" };
      }
  }
  const messages: Anthropic.MessageParam[] = [
      { role: "user", content: message }
  ];

  let response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      system: "You are a helpful assistant that manages the user's todo list. Use the available tools to help the user manage their tasks. Be concise and friendly.",
      tools,
      messages,
  });

    while (response.stop_reason === "tool_use") {
        const toolUseBlocks = response.content.filter(
            (b): b is Anthropic.ToolUseBlock => b.type === "tool_use"
        );

        const toolResults: Anthropic.ToolResultBlockParam[] = await Promise.all(
            toolUseBlocks.map(async (block) => ({
                type: "tool_result" as const,
                tool_use_id: block.id,
                content: JSON.stringify(await executeTool(block.name, block.input)),
            }))
        );

        messages.push({ role: "assistant", content: response.content });
        messages.push({ role: "user", content: toolResults });

        response = await anthropic.messages.create({
            model: "claude-sonnet-4-20250514",
            max_tokens: 1024,
            system: "You are a helpful assistant that manages the user's todo list. Use the available tools to help the user manage their tasks. Be concise and friendly.",
            tools,
            messages,
        });
    }
    const text = response.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("");
    res.json({ reply: text });
});

// These must be LAST
app.use(express.static(path.join(__dirname, "../dist")));
app.get("/{*path}", (_req, res) => {
    res.sendFile(path.join(__dirname, "../dist/index.html"));
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
