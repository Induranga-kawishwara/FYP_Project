import React, { useState } from "react";

const DeleteData = () => {
  const [email, setEmail] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [loading, setLoading] = useState(false);

  const handleDeletionRequest = async (e) => {
    e.preventDefault();
    setLoading(true);
    // Here you would call your API endpoint to handle data deletion.
    // For example, you might do:
    // await axios.post('/api/delete-data', { email });
    // For now, we'll simulate an API call with a timeout.
    setTimeout(() => {
      setLoading(false);
      setConfirmation(
        "Your deletion request has been submitted. Please check your email for further instructions."
      );
    }, 1500);
  };

  return (
    <div style={styles.container}>
      <h1>User Data Deletion</h1>
      <p>
        To delete your personal data, please enter your email address below. We
        will send you a confirmation email with further instructions.
      </p>
      <form onSubmit={handleDeletionRequest} style={styles.form}>
        <input
          type="email"
          placeholder="Enter your email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          style={styles.input}
        />
        <button type="submit" style={styles.button} disabled={loading}>
          {loading ? "Submitting..." : "Submit Request"}
        </button>
      </form>
      {confirmation && <p style={styles.confirmation}>{confirmation}</p>}
      <p>
        If you have any questions, please contact us at{" "}
        <a href="mailto:support@example.com">support@example.com</a>.
      </p>
    </div>
  );
};

const styles = {
  container: {
    maxWidth: "600px",
    margin: "2rem auto",
    padding: "1rem",
    textAlign: "center",
    fontFamily: "Arial, sans-serif",
  },
  form: {
    margin: "2rem 0",
    display: "flex",
    flexDirection: "column",
    gap: "1rem",
  },
  input: {
    padding: "0.75rem",
    fontSize: "1rem",
    borderRadius: "4px",
    border: "1px solid #ccc",
  },
  button: {
    padding: "0.75rem",
    fontSize: "1rem",
    borderRadius: "4px",
    border: "none",
    backgroundColor: "#007BFF",
    color: "white",
    cursor: "pointer",
  },
  confirmation: {
    color: "green",
    fontWeight: "bold",
  },
};

export default DeleteData;
