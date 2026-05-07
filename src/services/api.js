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
        // Only redirect if user was already logged in (expired session)
        sessionStorage.clear();
        window.location.href = "/login";
      }
      // If no token, it's a login failure — let it bubble up to the page
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

      // ✅ STORE SESSION
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
        headers: {
          "Content-Type": "multipart/form-data",
        },
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
      const res = await axiosInstance.post("/admin/create-role", {
        role_name: roleName,
      });

      return { success: true, data: res.data };

    } catch (err) {
      return { success: false, error: handleError(err) };
    }
  },

  async assignRole(email, roleName) {
    try {
      const res = await axiosInstance.post("/admin/assign-role", {
        email,
        role_name: roleName,
      });

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

  // ------------------------
  // ADMIN — USERS
  // ------------------------
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
      const res = await axiosInstance.delete("/admin/delete-user", {
        data: { email },
      });
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

  // ------------------------
  // ADMIN — ROLES
  // ------------------------
  async deleteRole(roleName) {
    try {
      const res = await axiosInstance.delete("/admin/delete-role", {
        data: { role_name: roleName },
      });
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

  // ------------------------
  // ADMIN — PERMISSIONS
  // ------------------------
  async removePermissionFromRole(roleName, permissionName) {
    try {
      const res = await axiosInstance.delete(
        "/admin/remove-permission-from-role",
        {
          data: {
            role_name: roleName,
            permission_name: permissionName,
          },
        }
      );
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