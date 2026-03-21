import "./App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import ChatPage from "./pages/ChatPage";
import KnowledgeBasePage from "./pages/KnowledgeBasePage";
import UploadPage from "./pages/UploadPage";
import { useState } from "react";

function App() {

const [chatMessages, setChatMessages] = useState([]);

  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<ChatPage messages={chatMessages} setMessages={setChatMessages} />} />
          <Route path="/knowledge-base" element={<KnowledgeBasePage />} />
          <Route path="/upload" element={<UploadPage />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}

export default App;