const TypingIndicator = () => (
  <div className="flex space-x-1 mt-1">
    <div
      className="w-2 h-2 rounded-full bg-primary animate-bounce"
      style={{ animationDelay: "0ms" }}
    ></div>
    <div
      className="w-2 h-2 rounded-full bg-primary animate-bounce"
      style={{ animationDelay: "150ms" }}
    ></div>
    <div
      className="w-2 h-2 rounded-full bg-primary animate-bounce"
      style={{ animationDelay: "300ms" }}
    ></div>
  </div>
);

export default TypingIndicator;
