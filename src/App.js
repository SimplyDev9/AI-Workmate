import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import ChatPage from './pages/ChatPage';
import KnowledgeBasePage from './pages/KnowledgeBasePage';
import UploadPage from './pages/UploadPage';
import SharePointPage from './pages/SharePointPage';
import './App.css';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/"
          element={
            <Layout>
              <ChatPage />
            </Layout>
          }
        />
        <Route
          path="/knowledge-base"
          element={
            <Layout>
              <KnowledgeBasePage />
            </Layout>
          }
        />
        <Route
          path="/upload"
          element={
            <Layout>
              <UploadPage />
            </Layout>
          }
        />
        <Route
          path="/sharepoint"
          element={
            <Layout>
              <SharePointPage />
            </Layout>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;