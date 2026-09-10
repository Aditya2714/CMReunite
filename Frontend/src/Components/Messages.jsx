import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { FaComments, FaPaperPlane } from "react-icons/fa";
import api from "../services/api";
import { connectRealtime } from "../services/realtime";
import { useCurrentUser } from "../services/authService";

function Messages() {
  const currentUser = useCurrentUser() || {};
  const [searchParams] = useSearchParams();
  const [conversations, setConversations] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [selectedId, setSelectedId] = useState(searchParams.get("conversation") || "");
  const [recipientId, setRecipientId] = useState("");
  const [messages, setMessages] = useState([]);
  const [body, setBody] = useState("");
  const [status, setStatus] = useState("");

  const loadConversations = async () => {
    const response = await api.get("/messages");
    setConversations(response.data.data.conversations || []);
  };

  useEffect(() => {
    Promise.all([loadConversations(), api.get("/alumniList?limit=100")])
      .then(([, response]) => setContacts(response.data.data.alumni || []))
      .catch(() => setStatus("Unable to load conversations."));
    const socket = connectRealtime();
    const receive = ({ message, conversationId }) => {
      setConversations((current) => current);
      if (String(conversationId) === String(selectedId)) {
        setMessages((current) => [...current, message]);
      }
      loadConversations();
    };
    socket.on("message:new", receive);
    return () => socket.off("message:new", receive);
  }, [selectedId]);

  useEffect(() => {
    if (!selectedId) return;
    api.get(`/messages/${selectedId}`)
      .then((response) => setMessages(response.data.data.messages || []))
      .catch(() => setStatus("Unable to load this conversation."));
  }, [selectedId]);

  const selectedConversation = useMemo(
    () => conversations.find((item) => item._id === selectedId),
    [conversations, selectedId]
  );
  const otherParticipant = (conversation) =>
    conversation?.participants?.find((person) => person._id !== (currentUser.id || currentUser._id));

  const send = async (event) => {
    event.preventDefault();
    const selectedRecipient = recipientId || otherParticipant(selectedConversation)?._id;
    if (!selectedRecipient || !body.trim()) return;
    try {
      const response = await api.post("/messages", {
        recipientId: selectedRecipient,
        body: body.trim(),
      });
      const { message, conversationId } = response.data.data;
      setSelectedId(String(conversationId));
      setMessages((current) => [...current, message]);
      setBody("");
      setRecipientId("");
      await loadConversations();
    } catch (error) {
      setStatus(error.response?.data?.message || "Message could not be sent.");
    }
  };

  return (
    <main className="bg-slate-50 px-4 py-8">
      <section className="mx-auto max-w-6xl">
        <header className="rounded-lg bg-slate-950 p-6 text-white">
          <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-teal-200">
            Alumni messenger
          </p>
          <h1 className="mt-2 flex items-center gap-3 text-3xl font-extrabold">
            <FaComments /> Direct conversations
          </h1>
          <p className="mt-2 text-sm font-semibold text-slate-300">
            Messages and unread updates arrive in real time.
          </p>
        </header>

        {status && <p className="mt-4 rounded-lg bg-amber-50 p-3 font-semibold text-amber-800">{status}</p>}
        <div className="mt-6 grid overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm md:grid-cols-[300px_1fr]">
          <aside className="border-b border-slate-200 p-4 md:border-b-0 md:border-r">
            <label className="text-xs font-extrabold uppercase text-slate-500" htmlFor="new-recipient">
              Start a conversation
            </label>
            <select
              id="new-recipient"
              value={recipientId}
              onChange={(event) => {
                setRecipientId(event.target.value);
                setSelectedId("");
                setMessages([]);
              }}
              className="mt-2 w-full rounded-lg border border-slate-300 p-3"
            >
              <option value="">Choose an alumnus</option>
              {contacts
                .filter((contact) => String(contact.user) !== String(currentUser.id || currentUser._id))
                .map((contact) => (
                  <option key={contact._id} value={contact.user}>
                    {[contact.firstName, contact.lastName].filter(Boolean).join(" ") || contact.email}
                  </option>
                ))}
            </select>
            <h2 className="mt-6 text-sm font-extrabold text-slate-900">Recent conversations</h2>
            <div className="mt-2 space-y-2">
              {conversations.map((conversation) => {
                const person = otherParticipant(conversation);
                return (
                  <button
                    key={conversation._id}
                    type="button"
                    onClick={() => {
                      setSelectedId(conversation._id);
                      setRecipientId("");
                    }}
                    className={`w-full rounded-lg p-3 text-left text-sm font-bold ${
                      selectedId === conversation._id ? "bg-blue-700 text-white" : "bg-slate-100 text-slate-800"
                    }`}
                  >
                    {person?.name || person?.email || "Alumni member"}
                  </button>
                );
              })}
            </div>
          </aside>

          <section className="flex min-h-[520px] flex-col">
            <div className="flex-1 space-y-3 overflow-y-auto p-5">
              {!selectedId && !recipientId && (
                <p className="grid h-full place-items-center text-center font-semibold text-slate-500">
                  Select a conversation or choose an alumnus to begin.
                </p>
              )}
              {messages.map((message) => {
                const mine = String(message.sender) === String(currentUser.id || currentUser._id);
                return (
                  <div key={message._id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                    <p className={`max-w-[78%] rounded-2xl px-4 py-3 text-sm font-semibold ${
                      mine ? "bg-blue-700 text-white" : "bg-slate-100 text-slate-800"
                    }`}>
                      {message.body}
                    </p>
                  </div>
                );
              })}
            </div>
            <form onSubmit={send} className="flex gap-3 border-t border-slate-200 p-4">
              <label className="sr-only" htmlFor="message-body">Message</label>
              <input
                id="message-body"
                value={body}
                onChange={(event) => setBody(event.target.value)}
                maxLength={2000}
                disabled={!selectedId && !recipientId}
                placeholder="Write a message…"
                className="min-w-0 flex-1 rounded-lg border border-slate-300 px-4 py-3"
              />
              <button
                type="submit"
                disabled={!body.trim() || (!selectedId && !recipientId)}
                className="inline-flex items-center gap-2 rounded-lg bg-blue-700 px-5 font-extrabold text-white disabled:opacity-50"
              >
                <FaPaperPlane /> Send
              </button>
            </form>
          </section>
        </div>
      </section>
    </main>
  );
}

export default Messages;
