// app/page.js
"use client";

import { useState } from "react";
import { Container, TextField, Button, Typography } from "@mui/material";

export default function Home() {
  const [inputData, setInputData] = useState("");
  const [token, setToken] = useState("");
  const [result, setResult] = useState(null);

  const handleSubmit = async () => {
    try {
      const response = await fetch("/api/process", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ inputData, token }),
      });

      const data = await response.json();
      setResult(data);
    } catch (error) {
      console.error("Помилка:", error);
      setResult({ error: "Не вдалося отримати відповідь" });
    }
  };

  return (
    <Container maxWidth="sm">
      <Typography variant="h4" sx={{ mt: 4, mb: 2 }}>
        Імпорт договорів в Istudio
      </Typography>
      <TextField
        fullWidth
        label="Введіть номера договорів (кожен номер на новому рядку)"
        multiline
        rows={4}
        value={inputData}
        onChange={(e) => setInputData(e.target.value)}
        sx={{ mb: 2 }}
      />
      {/* <TextField
        fullWidth
        label="Введіть токен"
        value={token}
        onChange={(e) => setToken(e.target.value)}
        sx={{ mb: 2 }}
      /> */}
      <Button variant="contained" color="primary" fullWidth onClick={handleSubmit}>
        Виконати
      </Button>

      {result && (
        <Typography variant="body1" sx={{ mt: 2 }}>
          <strong>Результат:</strong>
          <pre>{JSON.stringify(result, null, 2)}</pre>
        </Typography>
      )}
    </Container>
  );
}
