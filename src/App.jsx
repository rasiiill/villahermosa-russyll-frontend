import { useEffect, useState } from "react";
import "./App.css";

const API_URL = import.meta.env.VITE_API_URL;

function App() {
  const [loggedIn, setLoggedIn] = useState(
    !!localStorage.getItem("access_token")
  );

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const [products, setProducts] = useState([]);
  const [message, setMessage] = useState("");

  const [form, setForm] = useState({
    product_name: "",
    description: "",
    price: "",
    quantity: "",
  });

  const [editingId, setEditingId] = useState(null);

  const getToken = () => localStorage.getItem("access_token");

  const handleLogin = async (e) => {
    e.preventDefault();

    setMessage("Logging in...");

    try {
      const response = await fetch(`${API_URL}/api/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username,
          password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.error || data.message || "Login failed.");
        return;
      }

      localStorage.setItem("access_token", data.access_token);
      localStorage.setItem("refresh_token", data.refresh_token);

      setLoggedIn(true);
      setUsername("");
      setPassword("");
      setMessage("");
    } catch (error) {
      console.error(error);
      setMessage("Unable to connect to the LavaLust API.");
    }
  };

const getProducts = async () => {
  try {
    const response = await fetch(`${API_URL}/api/products`, {
      method: "GET",
      cache: "no-store",
      headers: {
        Authorization: `Bearer ${getToken()}`,
        Accept: "application/json",
      },
    });

    if (response.status === 401) {
      logoutLocal();
      return;
    }

    const data = await response.json();

    if (response.ok) {
      setProducts(Array.isArray(data.data) ? data.data : []);
    }
  } catch (error) {
    console.error(error);
    setMessage("Failed to load products.");
  }
};

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  };

  const resetForm = () => {
    setForm({
      product_name: "",
      description: "",
      price: "",
      quantity: "",
    });

    setEditingId(null);
  };

  const saveProduct = async (e) => {
  e.preventDefault();

  const productData = {
    product_name: form.product_name,
    description: form.description,
    price: Number(form.price),
    quantity: Number(form.quantity),
  };

  const url = editingId
    ? `${API_URL}/api/products/${editingId}`
    : `${API_URL}/api/products`;

  const method = editingId ? "PUT" : "POST";

  try {
    const response = await fetch(url, {
      method,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${getToken()}`,
      },
      body: JSON.stringify(productData),
    });

    const data = await response.json();

    if (!response.ok) {
      setMessage(data.error || data.message || "Operation failed.");
      return;
    }

    if (editingId) {
      setProducts((currentProducts) =>
        currentProducts.map((product) =>
          product.id == editingId
            ? {
                ...product,
                ...productData,
              }
            : product
        )
      );

      setMessage("Product updated successfully.");
    } else {
      setProducts((currentProducts) => [
        ...currentProducts,
        {
          id: data.id,
          ...productData,
        },
      ]);

      setMessage("Product added successfully.");
    }

    resetForm();
    await getProducts();
  } catch (error) {
    console.error(error);
    setMessage("Unable to save product.");
  }
};

  const editProduct = (product) => {
    setEditingId(product.id);

    setForm({
      product_name: product.product_name,
      description: product.description || "",
      price: product.price,
      quantity: product.quantity,
    });

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

 const deleteProduct = async (id) => {
  const confirmed = window.confirm(
    "Are you sure you want to delete this product?"
  );

  if (!confirmed) return;

  try {
    const response = await fetch(`${API_URL}/api/products/${id}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${getToken()}`,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      setMessage(data.error || data.message || "Delete failed.");
      return;
    }

    // Remove immediately from React table
    setProducts((currentProducts) =>
      currentProducts.filter((product) => product.id != id)
    );

    setMessage("Product deleted successfully.");

    // Sync with database
    await getProducts();
  } catch (error) {
    console.error(error);
    setMessage("Unable to delete product.");
  }
};

  const handleLogout = async () => {
  const refreshToken = localStorage.getItem("refresh_token");

  // Logout immediately on the frontend
  localStorage.removeItem("access_token");
  localStorage.removeItem("refresh_token");

  setProducts([]);
  setLoggedIn(false);
  setMessage("");

  // Best-effort logout from LavaLust
  if (refreshToken) {
    try {
      await fetch(`${API_URL}/api/logout`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          refresh_token: refreshToken,
        }),
      });
    } catch (error) {
      console.error("Backend logout failed:", error);
    }
  }
};

  useEffect(() => {
    if (loggedIn) {
      getProducts();
    }
  }, [loggedIn]);

  if (!loggedIn) {
    return (
      <div className="login-page">
        <form className="login-card" onSubmit={handleLogin}>
          <h1>Product System</h1>
          <p className="subtitle">Login to continue</p>

          <input
            type="text"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />

          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <button type="submit">Login</button>

          {message && <p className="message">{message}</p>}
        </form>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="container">
        <header>
          <div>
            <h1>Product Management</h1>
          </div>

          <button className="logout-btn" onClick={handleLogout}>
            Logout
          </button>
        </header>

        <section className="form-card">
          <h2>{editingId ? "Edit Product" : "Add Product"}</h2>

          <form onSubmit={saveProduct}>
            <div className="form-grid">
              <input
                name="product_name"
                placeholder="Product Name"
                value={form.product_name}
                onChange={handleChange}
                required
              />

              <input
                name="price"
                type="number"
                step="0.01"
                min="0"
                placeholder="Price"
                value={form.price}
                onChange={handleChange}
                required
              />

              <input
                name="quantity"
                type="number"
                min="0"
                placeholder="Quantity"
                value={form.quantity}
                onChange={handleChange}
                required
              />

              <input
                name="description"
                placeholder="Description"
                value={form.description}
                onChange={handleChange}
              />
            </div>

            <div className="form-actions">
              <button type="submit">
                {editingId ? "Update Product" : "Add Product"}
              </button>

              {editingId && (
                <button
                  type="button"
                  className="cancel-btn"
                  onClick={resetForm}
                >
                  Cancel
                </button>
              )}
            </div>
          </form>
        </section>

        {message && <div className="notice">{message}</div>}

        <section className="table-card">
          <div className="table-heading">
            <h2>Products</h2>

            <button onClick={getProducts}>Refresh</button>
          </div>

          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Product</th>
                  <th>Description</th>
                  <th>Price</th>
                  <th>Quantity</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {products.length > 0 ? (
                  products.map((product) => (
                    <tr key={product.id}>
                      <td>{product.id}</td>
                      <td>{product.product_name}</td>
                      <td>{product.description}</td>
                      <td>
                        ₱{Number(product.price).toLocaleString()}
                      </td>
                      <td>{product.quantity}</td>

                      <td className="actions">
                        <button
                          className="edit-btn"
                          onClick={() => editProduct(product)}
                        >
                          Edit
                        </button>

                        <button
                          className="delete-btn"
                          onClick={() => deleteProduct(product.id)}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="6" className="empty">
                      No products found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}

export default App;