import "dotenv/config";
import express from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import prisma from "./db.js";

const app = express();
const PORT = 3000;
const JWT_SECRET = process.env.JWT_SECRET;

app.use(express.json());

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
app.get("/todos", authenticate, async (_req, res) => {
    const todos = await prisma.todo.findMany(); 
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

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
