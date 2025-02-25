import { useState, useEffect } from "react";
import {
  Button,
  Container,
  Typography,
  TextField,
  Box,
  CircularProgress,
} from "@mui/material";
import FolderIcon from "@mui/icons-material/Folder";
import GreetingPrompt from "../components/GreetingPrompt";
import AIBubble from "../components/AIBubble";
import UserBubble from "../components/UserBubble";

const Home = () => {
  const [ws, setWs] = useState(null);
  const [selectedDirectory, setSelectedDirectory] = useState(null);
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    const socket = new WebSocket("ws://localhost:8001"); // Replace with your WebSocket server URL

    socket.onopen = () => {
      console.log("WebSocket Connected");
      setWs(socket);
    };

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        if (!data.answer || !data.description) {
          throw new Error("Invalid response format");
        }

        setHistory((prevHistory) => {
          const lastEntry = prevHistory[prevHistory.length - 1];
          return [
            ...prevHistory.slice(0, -1),
            {
              ...lastEntry,
              response: data.description,
              changed_dir: data.answer,
              loading: false
            }
          ];
        });

        setError(null);
      } catch (error) {
        console.error("Error parsing WebSocket message:", error);
        setError("Invalid response from server.");
      } finally {
        setLoading(false);
      }
    };

    socket.onerror = (error) => {
      console.error("WebSocket Error:", error);
      setError("WebSocket encountered an error.");
    };

    socket.onclose = () => {
      console.log("WebSocket Disconnected");
    };

    return () => {
      socket.close();
    };
  }, []);

  const handleChooseDirectory = async () => {
    if (window.electron && window.electron.openDirectory) {
      const directory = await window.electron.openDirectory();
      if (directory) {
        setSelectedDirectory(directory);
      }
    }
  };

  const handleSubmitPrompt = () => {
    if (!prompt.trim() || !ws || ws.readyState !== WebSocket.OPEN) {
      setError("WebSocket is not connected.");
      return;
    }

    setHistory((prevHistory) => [
      ...prevHistory,
      { prompt, response: null, changed_dir: null, loading: true },
    ]);


    setLoading(true);
    setError(null);

    const message = JSON.stringify({
      prompt: prompt,
      root_dir: selectedDirectory,
    });
    ws.send(message);

    setPrompt("");

    // Fallback timeout if no response arrives
    setTimeout(() => {
      if (loading) {
        setLoading(false);
        setError("Server did not respond in time.");
      }
    }, 20000); 
  };

  return (
    <Container
      sx={{
        textAlign: "center",
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        position: "relative", 
      }}>
      {/* Folder Selection */}
      {selectedDirectory && (
        <Box
          sx={{
            position: "absolute",
            top: 20,
            left: 20,
            display: "flex",
            alignItems: "center",
            gap: 1,
          }}
          onClick={handleChooseDirectory} >
          <FolderIcon color="primary"/>
          <Typography
            variant="h6"
            sx={{
              maxWidth: 300,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}>
            {selectedDirectory}
          </Typography>
        </Box>
      )}

      {!selectedDirectory && (
        <Button
          variant="contained"
          color="primary"
          onClick={handleChooseDirectory}>
          Choose Directory
        </Button>
      )}

      {/* Chat History */}
      {selectedDirectory && (
      <Box 
        sx={{ 
          width: "100%", 
          marginTop: "4rem", 
          marginBottom: "7rem", 
          flexGrow: 1, 
          overflowY: "auto",
          maxHeight: "calc(100vh - 12rem)", 
        }}>
        {history.map((entry, index) => (
          <Box key={index} sx={{ display: "block", padding: "5px 0" }}>
            <UserBubble content={entry.prompt} />
            {entry.loading ? (
              <Box sx={{ 
                display: "flex", 
                justifyContent: "center",
                alignItems: "center", 
                p: 2 
              }}>
                <CircularProgress size={24} />
              </Box>
            ) : (
              entry.response && <AIBubble content={entry.response} />
            )}
          </Box>
        ))}
      </Box>
     )}

      {/* Error Message */}
      {error && (
        <Typography variant="body2" sx={{ color: "red", marginTop: "10px" }}>
          {error}
        </Typography>
      )}

      {/* Bottom Overlay and Prompt */}
      {selectedDirectory && (
        <>
          <Box
            sx={{
              position: "fixed",
              bottom: 0,
              left: 0,
              right: 0,
              height: "220px",
              background: "linear-gradient(transparent, #1a202c 30%)", 
              pointerEvents: "none",
            }}
          />
          <Box
            sx={{
              position: "fixed",
              bottom: 20,
              left: "50%",
              transform: "translateX(-50%)",
              width: "60%",
              display: "flex",
              gap: 1,
              zIndex: 1,
            }}>
            <GreetingPrompt
              prompt={prompt}
              setPrompt={setPrompt}
              handleSubmit={handleSubmitPrompt}
            />
          </Box>
        </>
      )}
    </Container>
  );
};

export default Home;
