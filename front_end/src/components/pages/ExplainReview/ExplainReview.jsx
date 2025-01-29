import React, { useState } from "react";
import axios from "axios";
import {
  Container,
  TextField,
  Button,
  Typography,
  Card,
  CardContent,
} from "@mui/material";

function ExplainReview() {
  const [review, setReview] = useState("");
  const [explanation, setExplanation] = useState(null);

  const handleExplain = async () => {
    const response = await axios.post("http://127.0.0.1:5000/explain_review", {
      review,
    });
    setExplanation(response.data);
  };

  return (
    <Container>
      <Typography variant="h4">Explain Review Prediction</Typography>
      <TextField
        label="Enter Review"
        fullWidth
        value={review}
        onChange={(e) => setReview(e.target.value)}
      />
      <Button variant="contained" color="primary" onClick={handleExplain}>
        Explain
      </Button>

      {explanation && (
        <Card sx={{ mt: 3 }}>
          <CardContent>
            <Typography variant="h6">
              Top Words Influencing Prediction:
            </Typography>
            {explanation.explanation.map((item, index) => (
              <Typography key={index}>
                {item.word}: <strong>{item.weight}</strong>
              </Typography>
            ))}
          </CardContent>
        </Card>
      )}
    </Container>
  );
}

export default ExplainReview;
