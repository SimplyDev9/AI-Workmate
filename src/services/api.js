import axios from "axios";

const BASE_URL = process.env.REACT_APP_BACKEND_URL;

// ------------------------
// AXIOS INSTANCE
// ------------------------
const axiosInstance = axios.create({
  baseURL: BASE_URL
});

// ------------------------
// REQUEST INTERCEPTOR
// ------------------------
axiosInstance.interceptors.request.use((config) => {
  const token = sessionStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ------------------------
// RESPONSE INTERCEPTOR
// ------------------------
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const token = sessionStorage.getItem("token");
      if (token) {
        sessionStorage.clear();
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

// ------------------------
// ERROR HANDLER
// ------------------------
const handleError = (error) => {
  if (error.response?.status === 429) {
    return "Too many attempts. Please wait a minute before trying again.";
  }
  const detail = error.response?.data?.detail;
  if (Array.isArray(detail)) {
    return detail.map((d) => d.msg || JSON.stringify(d)).join("; ");
  }
  return (
    detail ||
    error.response?.data?.message ||
    error.message ||
    "Something went wrong"
  );
};

// ------------------------
// API SERVICE
// ------------------------
const apiService = {

  // ------------------------
  // AUTH
  // ------------------------
  async login(email, password) {
    try {
      const res = await axiosInstance.post("/auth/login", { email, password });
      const data = res.data;
      sessionStorage.setItem("token", data.access_token);
      sessionStorage.setItem("permissions", JSON.stringify(data.permissions));
      sessionStorage.setItem("roles", JSON.stringify(data.roles));
      return { success: true, data };
    } catch (err) {
      return { success: false, error: handleError(err) };
    }
  },

  async signup(email, password) {
    try {
      const res = await axiosInstance.post("/auth/signup", {
        email,
        password,
        role_name: "USER",
      });
      return { success: true, data: res.data };
    } catch (err) {
      return { success: false, error: handleError(err) };
    }
  },

  logout() {
    sessionStorage.clear();
    window.location.href = "/login";
  },

  // ------------------------
  // HEALTH
  // ------------------------
  async checkHealth() {
    try {
      const res = await axiosInstance.get("/health");
      return { success: true, data: res.data };
    } catch (err) {
      return { success: false, error: handleError(err) };
    }
  },

  // ------------------------
  // CHAT
  // ------------------------
  async sendMessage(query) {
    try {
      const res = await axiosInstance.post("/chat", { query });
      return { success: true, data: res.data };
    } catch (err) {
      return { success: false, error: handleError(err) };
    }
  },

  // ------------------------
  // VOICE — Speech-to-Text (Amazon Transcribe)
  // ------------------------
  /**
   * Upload a WebM/audio blob to the backend.
   * Backend runs Amazon Transcribe and returns { transcript: "..." }
   *
   * @param {Blob} audioBlob  — recorded audio from MediaRecorder
   * @returns {{ success: boolean, data?: { transcript: string }, error?: string }}
   */
  async transcribeAudio(audioBlob) {
    try {
      const formData = new FormData();
      formData.append("audio", audioBlob, "recording.webm");

      const res = await axiosInstance.post("/voice/transcribe", formData, {
        headers: { "Content-Type": "multipart/form-data" },
        // Transcribe can take a few seconds — allow up to 30 s
        timeout: 30_000,
      });

      return { success: true, data: res.data };
    } catch (err) {
      return { success: false, error: handleError(err) };
    }
  },

  // ------------------------
  // VOICE — Text-to-Speech (Amazon Polly)
  // ------------------------
  /**
   * Send AI response text to the backend.
   * Backend calls Amazon Polly and returns an audio blob.
   * We create a local object URL so the browser can play it.
   *
   * @param {string} text  — text to synthesize
   * @param {string} [voiceId="Joanna"]  — Polly voice ID
   * @returns {{ success: boolean, audioUrl?: string, error?: string }}
   */
  async synthesizeSpeech(text, voiceId = "Joanna") {
    try {
      const res = await axiosInstance.post(
        "/voice/synthesize",
        { text, voice_id: voiceId },
        {
          responseType: "blob",
          timeout: 20_000,
        }
      );

      const audioUrl = URL.createObjectURL(res.data);
      return { success: true, audioUrl };
    } catch (err) {
      return { success: false, error: handleError(err) };
    }
  },

  // ------------------------
  // DOCUMENTS
  // ------------------------
  async listDocuments() {
    try {
      const res = await axiosInstance.get("/list_docs");
      return { success: true, data: res.data };
    } catch (err) {
      return { success: false, error: handleError(err) };
    }
  },

  async deleteDocument(filename) {
    try {
      const res = await axiosInstance.delete("/delete_doc", {
        params: { filename },
      });
      return { success: true, data: res.data };
    } catch (err) {
      return { success: false, error: handleError(err) };
    }
  },

  async uploadDocument(file, onProgress) {
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await axiosInstance.post("/upload_doc", formData, {
        headers: { "Content-Type": "multipart/form-data" },
        onUploadProgress: (event) => {
          if (onProgress && event.total) {
            const percent = Math.round((event.loaded * 100) / event.total);
            onProgress(percent);
          }
        },
      });

      return { success: true, data: res.data };
    } catch (err) {
      return { success: false, error: handleError(err) };
    }
  },

  // ------------------------
  // SHAREPOINT
  // ------------------------
  async getSiteId(hostname, siteName) {
    try {
      const res = await axiosInstance.post("/get_site_id", {
        hostname,
        site_name: siteName,
      });
      return { success: true, data: res.data };
    } catch (err) {
      return { success: false, error: handleError(err) };
    }
  },

  async ingestSharePoint(siteId, folderPath) {
    try {
      const res = await axiosInstance.post(
        `/ingest_sharepoint?site_id=${encodeURIComponent(siteId)}&folder_path=${encodeURIComponent(folderPath)}`
      );
      return { success: true, data: res.data };
    } catch (err) {
      return { success: false, error: handleError(err) };
    }
  },

  // ------------------------
  // ADMIN
  // ------------------------
  async createRole(roleName) {
    try {
      const res = await axiosInstance.post("/admin/create-role", { role_name: roleName });
      return { success: true, data: res.data };
    } catch (err) {
      return { success: false, error: handleError(err) };
    }
  },

  async assignRole(email, roleName) {
    try {
      const res = await axiosInstance.post("/admin/assign-role", { email, role_name: roleName });
      return { success: true, data: res.data };
    } catch (err) {
      return { success: false, error: handleError(err) };
    }
  },

  async updateRolePermissions(roleName, permissions) {
    try {
      const res = await axiosInstance.post("/admin/update-role-permissions", {
        role_name: roleName,
        permissions,
      });
      return { success: true, data: res.data };
    } catch (err) {
      return { success: false, error: handleError(err) };
    }
  },

  async listUsers() {
    try {
      const res = await axiosInstance.get("/admin/list-users");
      return { success: true, data: res.data };
    } catch (err) {
      return { success: false, error: handleError(err) };
    }
  },

  async deleteUser(email) {
    try {
      const res = await axiosInstance.delete("/admin/delete-user", { data: { email } });
      return { success: true, data: res.data };
    } catch (err) {
      return { success: false, error: handleError(err) };
    }
  },

  async reactivateUser(email) {
    try {
      const res = await axiosInstance.post("/admin/reactivate-user", { email });
      return { success: true, data: res.data };
    } catch (err) {
      return { success: false, error: handleError(err) };
    }
  },

  async deleteRole(roleName) {
    try {
      const res = await axiosInstance.delete("/admin/delete-role", { data: { role_name: roleName } });
      return { success: true, data: res.data };
    } catch (err) {
      return { success: false, error: handleError(err) };
    }
  },

  async removeRole(email, roleName) {
    try {
      const res = await axiosInstance.delete("/admin/remove-role", {
        data: { email, role_name: roleName },
      });
      return { success: true, data: res.data };
    } catch (err) {
      return { success: false, error: handleError(err) };
    }
  },

  async removePermissionFromRole(roleName, permissionName) {
    try {
      const res = await axiosInstance.delete("/admin/remove-permission-from-role", {
        data: { role_name: roleName, permission_name: permissionName },
      });
      return { success: true, data: res.data };
    } catch (err) {
      return { success: false, error: handleError(err) };
    }
  },

  async getRolePermissions(roleName) {
    try {
      const res = await axiosInstance.get(`/admin/role-permissions/${roleName}`);
      return { success: true, data: res.data };
    } catch (err) {
      return { success: false, error: handleError(err) };
    }
  },

  async listRoles() {
    try {
      const res = await axiosInstance.get("/admin/list-roles");
      return { success: true, data: res.data };
    } catch (err) {
      return { success: false, error: handleError(err) };
    }
  },

  async clearDatabase() {
    try {
      const res = await axiosInstance.delete("/clear_db");
      return { success: true, data: res.data };
    } catch (err) {
      return { success: false, error: handleError(err) };
    }
  },

  async getMe() {
    try {
      const res = await axiosInstance.get("/auth/me");
      return { success: true, data: res.data };
    } catch (err) {
      return { success: false, error: handleError(err) };
    }
  },
};

export default apiService;