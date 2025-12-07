import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient'; // add this line

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadUser = async () => {
      setLoading(true);
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) {
        console.error('Failed to get Supabase session:', error.message);
        setLoading(false);
        return;
      }

      if (session?.user) {
        // Map Supabase user metadata to match your previous structure
        const fullUser = {
          ...session.user,
          name: session.user.user_metadata?.name || session.user.raw_user_meta_data?.name,
          role: session.user.user_metadata?.role || session.user.raw_user_meta_data?.role || 'customer',
          phone: session.user.user_metadata?.phone || session.user.raw_user_meta_data?.phone,
          address: session.user.user_metadata?.address || session.user.raw_user_meta_data?.address,
        };

        setUser(fullUser);
      }
      setLoading(false);
    };

    loadUser();
  }, []);

  // ✅ Register a new user
 // ✅ AuthContext register function
  const register = async ({ name, email, phone, address, password }) => {
    try {
      // 1️⃣ Create user in Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          // optional: you can store some metadata
          data: { name, phone, address, role: 'customer' },
        },
      });

      if (authError) throw new Error(authError.message);

      const userId = authData.user?.id;
      if (!userId) throw new Error('User registration incomplete. Please confirm your email.');

      // 2️⃣ Insert into customers table
      const { error: customerError } = await supabase
        .from('customers')
        .insert([
          {
            user_id: userId,
            full_name: name,
            phone,
            address,
          },
        ]);

      if (customerError) throw new Error(customerError.message);

      // 3️⃣ Set local state
      setUser(authData.user);

      return authData.user;
    } catch (error) {
      throw error;
    }
  };

  // ✅ Login existing user
  const login = async ({ email, password }) => {
    // 1️⃣ Login attempt
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) throw error;

    // 2️⃣ Get the *full* user object after login (VERY IMPORTANT)
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError) throw userError;

    const u = userData.user;

    // 3️⃣ Build user with complete metadata
    const fullUser = {
      ...u,
      name: u.user_metadata?.name || u.raw_user_meta_data?.name,
      role: u.user_metadata?.role || u.raw_user_meta_data?.role || 'customer',
      phone: u.user_metadata?.phone || u.raw_user_meta_data?.phone,
      address: u.user_metadata?.address || u.raw_user_meta_data?.address,
    };

    // 4️⃣ Save user
    setUser(fullUser);
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    // setOrderHistory is not defined here, remove it
  };

  // ✅ Update the currently logged in user's profile
  const updateProfile = async (updates) => {
    if (!user) throw new Error("No user logged in");

    const authPayload = {};

    // Only send changed fields
    if (updates.email) authPayload.email = updates.email;
    if (updates.password) authPayload.password = updates.password;

    // Attach metadata
    authPayload.data = {
      name: updates.name,
      phone: updates.phone,
      address: updates.address,
    };

    // 1️⃣ Update Supabase Auth (metadata, email, password)
    const { data, error } = await supabase.auth.updateUser(authPayload);
    if (error) throw error;

    // 2️⃣ Find customer_id in customers table
    const { data: customer, error: customerError } = await supabase
      .from("customers")
      .select("customer_id")
      .eq("user_id", user.id)
      .single();

    if (customerError) throw customerError;

    // 3️⃣ Update customers table
    const { error: updateCustomerError } = await supabase
      .from("customers")
      .update({
        full_name: updates.name,
        phone: updates.phone,
        address: updates.address,
      })
      .eq("customer_id", customer.customer_id);

    if (updateCustomerError) throw updateCustomerError;

    // 4️⃣ Update local state
    setUser({
      ...data.user,
      name: updates.name,
      phone: updates.phone,
      address: updates.address,
    });
  };

  // ✅ Verify current password before allowing email/password changes
  const verifyCurrentPassword = async (currentPassword) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPassword,
      });
      return !error;
    } catch {
      return false;
    }
  };

  // ✅ Fetch this user's order history from Supabase
const fetchOrders = async () => {
  if (!user) return [];

  // 1️⃣ Get the customer's Supabase 'customer_id' (same as checkout uses)
  const { data: customer, error: customerError } = await supabase
    .from('customers')
    .select('customer_id')
    .eq('user_id', user.id)
    .single();

  if (customerError) {
    console.error('Error fetching customer:', customerError);
    return [];
  }

  const customerId = customer.customer_id;

    // 2️⃣ Fetch orders using the customer_id
    const { data, error } = await supabase
      .from("orders")
      .select(`
        id,
        customer_id,
        total_amount,
        payment_method,
        delivery_method,
        status,
        created_at,
        order_items (
          id,
          product_id,
          quantity,
          price,
          flavors,
          toppings,
          products (
            id,
            name,
             image_url
          )
        )
      `)
      .eq("customer_id", customerId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching orders:", error);
      return [];
    }

        // ⚡ Map the orders to your frontend-friendly structure
    const mappedOrders = data.map(order => ({
      ...order,
      items: order.order_items.map(item => ({
        id: item.id,
        quantity: item.quantity,
        totalPrice: item.price,
        product: {
          name: item.products.name,
          image: item.products.image_url
        },
        customizations: {
          flavors: item.flavors || [],
          toppings: item.toppings || {}
        }
      }))
    }));

    return mappedOrders;
  };

  const value = {
    user,
    login,
    logout,
    register,
    updateProfile,
    loading,
    isAdmin: user?.role === 'admin',
    isCustomer: user?.role === 'customer',
    verifyCurrentPassword, // ✅ added for current password verification
    fetchOrders,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
