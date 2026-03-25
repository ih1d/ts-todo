import { type FormEvent, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

interface Todo {
  id: string;
  title: string;
  description: string | null;
  completed: boolean;
  priority: string;
  dueDate: string | null;
  createdAt: string;
}

interface ChatMessage {
  role: "user" | "assistant";
  text: string;
}

function getToken() {
  return localStorage.getItem("token");
}

function authHeaders() {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${getToken()}`,
  };
}

export default function Home() {
  const navigate = useNavigate();
  const [todos, setTodos] = useState<Todo[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("medium");
  const [dueDate, setDueDate] = useState("");
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages, chatLoading]);

  useEffect(() => {
    if (!getToken()) {
      navigate("/login", { replace: true });
      return;
    }
    fetchTodos();
  }, [navigate]);

  async function fetchTodos() {
    try {
      const res = await fetch("/todos", { headers: authHeaders() });
      if (res.status === 401) {
        localStorage.removeItem("token");
        navigate("/login", { replace: true });
        return;
      }
      const data = await res.json();
      setTodos(data);
    } finally {
      setLoading(false);
    }
  }

  async function handleAdd(e: FormEvent) {
    e.preventDefault();
    const res = await fetch("/todos", {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({
        title,
        description: description || undefined,
        priority,
        dueDate: dueDate ? new Date(dueDate).toISOString() : undefined,
      }),
    });
    const todo = await res.json();
    setTodos((prev) => [todo, ...prev]);
    setTitle("");
    setDescription("");
    setPriority("medium");
    setDueDate("");
    setShowForm(false);
  }

  async function handleComplete(id: string) {
    const res = await fetch(`/todos/${id}/complete`, {
      method: "PATCH",
      headers: authHeaders(),
    });
    const updated = await res.json();
    setTodos((prev) => prev.map((t) => (t.id === id ? updated : t)));
  }

  async function handleDelete(id: string) {
    await fetch(`/todos/${id}`, {
      method: "DELETE",
      headers: authHeaders(),
    });
    setTodos((prev) => prev.filter((t) => t.id !== id));
  }

  function handleLogout() {
    localStorage.removeItem("token");
    navigate("/login", { replace: true });
  }

  async function handleChatSend(e: FormEvent) {
    e.preventDefault();
    const text = chatInput.trim();
    if (!text || chatLoading) return;

    setChatMessages((prev) => [...prev, { role: "user", text }]);
    setChatInput("");
    setChatLoading(true);

    try {
      const res = await fetch("/chat", {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ message: text }),
      });
      const data = await res.json();
      setChatMessages((prev) => [
        ...prev,
        { role: "assistant", text: data.reply },
      ]);
      await fetchTodos();
    } catch {
      setChatMessages((prev) => [
        ...prev,
        { role: "assistant", text: "Something went wrong. Please try again." },
      ]);
    } finally {
      setChatLoading(false);
    }
  }

  const pending = todos.filter((t) => !t.completed);
  const completed = todos.filter((t) => t.completed);

  const priorityColor: Record<string, string> = {
    low: "bg-green-100 text-green-700",
    medium: "bg-yellow-100 text-yellow-700",
    high: "bg-red-100 text-red-700",
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      <header className="border-b border-gray-200 bg-white">
        <div className="flex items-center justify-between px-4 py-4">
          <h1 className="text-2xl font-bold text-gray-900">Anrim</h1>
          <button
            onClick={handleLogout}
            className="cursor-pointer text-sm font-medium text-gray-500 hover:text-gray-700"
          >
            Sign out
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Todo list */}
        <main className="flex-1 overflow-y-auto px-4 py-8">
          <div className="mx-auto max-w-3xl">
            {/* Add todo button / form */}
            {!showForm ? (
              <button
                onClick={() => setShowForm(true)}
                className="mb-6 w-full cursor-pointer rounded-lg border-2 border-dashed border-gray-300 px-4 py-3 text-sm font-medium text-gray-500 hover:border-indigo-400 hover:text-indigo-600"
              >
                + Add a new todo
              </button>
            ) : (
              <form
                onSubmit={handleAdd}
                className="mb-6 space-y-4 rounded-lg bg-white p-4 shadow-sm"
              >
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="What needs to be done?"
                  className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm placeholder:text-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  autoFocus
                />
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Description (optional)"
                  rows={2}
                  className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm placeholder:text-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
                <div className="flex gap-4">
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                    className="rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    type="submit"
                    className="cursor-pointer rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500"
                  >
                    Add
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowForm(false)}
                    className="cursor-pointer rounded-lg px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}

            {/* Pending todos */}
            {pending.length > 0 && (
              <section className="mb-8">
                <h2 className="mb-3 text-sm font-semibold tracking-wide text-gray-500 uppercase">
                  Pending ({pending.length})
                </h2>
                <ul className="space-y-2">
                  {pending.map((todo) => (
                    <TodoItem
                      key={todo.id}
                      todo={todo}
                      priorityColor={priorityColor}
                      onComplete={handleComplete}
                      onDelete={handleDelete}
                    />
                  ))}
                </ul>
              </section>
            )}

            {/* Completed todos */}
            {completed.length > 0 && (
              <section>
                <h2 className="mb-3 text-sm font-semibold tracking-wide text-gray-500 uppercase">
                  Completed ({completed.length})
                </h2>
                <ul className="space-y-2">
                  {completed.map((todo) => (
                    <TodoItem
                      key={todo.id}
                      todo={todo}
                      priorityColor={priorityColor}
                      onComplete={handleComplete}
                      onDelete={handleDelete}
                    />
                  ))}
                </ul>
              </section>
            )}

            {todos.length === 0 && (
              <p className="text-center text-gray-400">
                No todos yet. Add one above!
              </p>
            )}
          </div>
        </main>

        {/* Chat sidebar */}
        <aside className="flex w-80 flex-col border-l border-gray-200 bg-white">
          <div className="border-b border-gray-200 px-4 py-3">
            <h2 className="text-sm font-semibold text-gray-700">AI Assistant</h2>
            <p className="text-xs text-gray-400">Ask me to manage your todos</p>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
            {chatMessages.length === 0 && !chatLoading && (
              <p className="text-center text-xs text-gray-400 mt-8">
                Send a message to get started. Try "Add a todo to buy groceries" or "What are my pending tasks?"
              </p>
            )}
            {chatMessages.map((msg, i) => (
              <div
                key={i}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap ${
                    msg.role === "user"
                      ? "bg-indigo-600 text-white"
                      : "bg-gray-100 text-gray-800"
                  }`}
                >
                  {msg.text}
                </div>
              </div>
            ))}
            {chatLoading && (
              <div className="flex justify-start">
                <div className="flex items-center gap-1 rounded-lg bg-gray-100 px-3 py-2">
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-gray-400 [animation-delay:-0.3s]" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-gray-400 [animation-delay:-0.15s]" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-gray-400" />
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          <form
            onSubmit={handleChatSend}
            className="border-t border-gray-200 p-3"
          >
            <div className="flex gap-2">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Ask the AI..."
                disabled={chatLoading}
                className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm placeholder:text-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 focus:outline-none disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={chatLoading || !chatInput.trim()}
                className="cursor-pointer rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                  <path d="M3.105 2.288a.75.75 0 0 0-.826.95l1.414 4.926A1.5 1.5 0 0 0 5.135 9.25h6.115a.75.75 0 0 1 0 1.5H5.135a1.5 1.5 0 0 0-1.442 1.086l-1.414 4.926a.75.75 0 0 0 .826.95 28.11 28.11 0 0 0 15.293-7.154.75.75 0 0 0 0-1.115A28.11 28.11 0 0 0 3.105 2.289z" />
                </svg>
              </button>
            </div>
          </form>
        </aside>
      </div>
    </div>
  );
}

function TodoItem({
  todo,
  priorityColor,
  onComplete,
  onDelete,
}: {
  todo: Todo;
  priorityColor: Record<string, string>;
  onComplete: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <li className="flex items-start gap-3 rounded-lg bg-white px-4 py-3 shadow-sm">
      <button
        onClick={() => !todo.completed && onComplete(todo.id)}
        disabled={todo.completed}
        className={`mt-0.5 h-5 w-5 flex-shrink-0 cursor-pointer rounded-full border-2 ${
          todo.completed
            ? "border-indigo-500 bg-indigo-500"
            : "border-gray-300 hover:border-indigo-400"
        }`}
        aria-label={todo.completed ? "Completed" : "Mark complete"}
      >
        {todo.completed && (
          <svg viewBox="0 0 20 20" fill="white" className="h-full w-full p-0.5">
            <path
              fillRule="evenodd"
              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
              clipRule="evenodd"
            />
          </svg>
        )}
      </button>

      <div className="flex-1 min-w-0">
        <p
          className={`text-sm font-medium ${
            todo.completed ? "text-gray-400 line-through" : "text-gray-900"
          }`}
        >
          {todo.title}
        </p>
        {todo.description && (
          <p className="mt-0.5 text-sm text-gray-500">{todo.description}</p>
        )}
        <div className="mt-1 flex items-center gap-2">
          <span
            className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${priorityColor[todo.priority] ?? "bg-gray-100 text-gray-600"}`}
          >
            {todo.priority}
          </span>
          {todo.dueDate && (
            <span className="text-xs text-gray-400">
              Due {new Date(todo.dueDate).toLocaleDateString()}
            </span>
          )}
        </div>
      </div>

      <button
        onClick={() => onDelete(todo.id)}
        className="cursor-pointer text-gray-300 hover:text-red-500"
        aria-label="Delete todo"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          className="h-5 w-5"
        >
          <path
            fillRule="evenodd"
            d="M8.75 1A2.75 2.75 0 006 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 10.23 1.482l.149-.022.841 10.518A2.75 2.75 0 007.596 19h4.807a2.75 2.75 0 002.742-2.53l.841-10.52.149.023a.75.75 0 00.23-1.482A41.03 41.03 0 0014 4.193V3.75A2.75 2.75 0 0011.25 1h-2.5zM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4zM8.58 7.72a.75.75 0 00-1.5.06l.3 7.5a.75.75 0 101.5-.06l-.3-7.5zm4.34.06a.75.75 0 10-1.5-.06l-.3 7.5a.75.75 0 101.5.06l.3-7.5z"
            clipRule="evenodd"
          />
        </svg>
      </button>
    </li>
  );
}
