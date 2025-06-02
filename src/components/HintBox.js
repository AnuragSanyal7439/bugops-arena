function HintBox({ hint }) {
  return (
    <div
      style={{
        marginTop: "1rem",
        background: "#eef",
        padding: "1rem",
        borderRadius: "8px",
        border: "1px solid #ccc",
      }}
    >
      <strong>Hint:</strong>{" "}
      {hint ? hint : "Click 'Get Hint' to receive help with debugging."}
    </div>
  );
}

export default HintBox;
