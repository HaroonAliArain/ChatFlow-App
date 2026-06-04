const TypingIndicator = () => {
  return (
    <div className="flex items-center gap-2 px-2 py-2 mt-1 animate-fade-in">
      <div className="flex items-center gap-1 bg-app-input rounded-2xl px-4 py-2.5 shadow-app-sm border border-app">
        <span
          className="w-2 h-2 rounded-full animate-bounce"
          style={{ background: "var(--accent)", animationDelay: "0ms", animationDuration: "1s" }}
        />
        <span
          className="w-2 h-2 rounded-full animate-bounce"
          style={{ background: "var(--accent)", animationDelay: "200ms", animationDuration: "1s" }}
        />
        <span
          className="w-2 h-2 rounded-full animate-bounce"
          style={{ background: "var(--accent)", animationDelay: "400ms", animationDuration: "1s" }}
        />
      </div>
    </div>
  );
};

export default TypingIndicator;
