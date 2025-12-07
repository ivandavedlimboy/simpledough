import React, { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Package, Calendar } from "lucide-react"; // removed XCircle

// Helper to convert UTC to Philippine Time (UTC+8)
const toPHT = (utcDate) => {
  const date = new Date(utcDate);
  return new Date(date.getTime() + 8 * 60 * 60 * 1000); // add 8 hours
};

const OrderHistory = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const { fetchOrders } = useAuth(); // use Supabase fetchOrders

  useEffect(() => {
    const loadOrders = async () => {
      if (user) {
        const data = await fetchOrders(user.id);

        const mappedOrders = data.map(order => ({
          id: order.id,
          createdAt: order.created_at,
          status: order.status,
          // removed cancelledBy mapping (schema doesn't have cancelled_by)
          total: order.total_amount,
          items: (order.order_items || []).map(item => ({
            id: item.id,
            quantity: item.quantity,
            totalPrice: item.price,
            product: {
              name: item.products?.name,
              image: item.products?.image_url
            },
            customizations: {
              flavors: item.flavors || [],
              toppings: item.toppings || {}
            }
          }))
        }));

        setOrders(mappedOrders);
      }
    };

    loadOrders();
  }, [user, fetchOrders]);

  if (!user) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-10 text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          Please log in to view your orders
        </h2>
        <button
          onClick={() => navigate("/login")}
          className="bg-amber-500 text-white px-6 py-3 rounded-lg font-semibold hover:bg-amber-600 transition-all"
        >
          Go to Login
        </button>
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 text-center">
        <div className="text-8xl mb-4">📦</div>
        <h2 className="text-3xl font-bold text-gray-900 mb-3">No Orders Yet</h2>
        <p className="text-gray-600 mb-8">
          Once you place an order, it will appear here.
        </p>
        <button
          onClick={() => navigate("/menu")}
          className="bg-gradient-to-r from-amber-500 to-orange-500 text-white px-6 py-3 rounded-lg font-semibold hover:from-amber-600 hover:to-orange-600 transition-all"
        >
          Browse Menu
        </button>
      </div>
    );
  }

  // Find where the first completed order starts (delivered OR cancelled)
  const firstCompletedIndex = orders.findIndex(
    o => o.status === "delivered" || o.status === "cancelled"
  );

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center gap-4 mb-8">
        <button
          onClick={() => navigate(-1)}
          className="p-2 hover:bg-gray-100 rounded-full transition-colors"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Order History</h1>
          <p className="text-gray-600">{orders.length} orders found</p>
        </div>
      </div>

      <div className="space-y-6">
        {orders.map((order, index) => (
          <React.Fragment key={order.id}>
            {firstCompletedIndex !== -1 && index === firstCompletedIndex && (
              <div className="border-t border-gray-300 my-4"></div>
            )}
            <div className="bg-white shadow-lg rounded-xl p-6 border border-gray-100">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <Package className="w-5 h-5 text-amber-600" />
                  <h2 className="text-lg font-semibold text-gray-900">
                    Order #{order.id.slice(-8)}
                  </h2>
                </div>
                <div className="text-gray-500 flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  {toPHT(order.createdAt).toLocaleDateString()}{" "}
                  {toPHT(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>

              <div className="divide-y divide-gray-200">
                {order.items.map((item) => (
                  <div
                    key={item.id}
                    className="py-3 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      {item.product.image && (
                        <img
                          src={item.product.image}
                          alt={item.product.name}
                          className="w-16 h-16 object-cover rounded-lg"
                        />
                      )}
                      <div>
                        <p className="font-semibold text-gray-900">
                          {item.product.name}
                        </p>

                        {item.customizations?.flavors?.length > 0 && (
                          <p className="text-sm text-gray-600">
                            <span className="font-medium">Flavors:</span>{" "}
                            {item.customizations.flavors.join(", ")}
                          </p>
                        )}

                        {item.customizations?.toppings && (
                          <>
                            {item.customizations.toppings.classic && (
                              <p className="text-sm text-gray-600">
                                <span className="font-medium">Classic:</span>{" "}
                                {item.customizations.toppings.classic}
                              </p>
                            )}
                            {item.customizations.toppings.premium && (
                              <p className="text-sm text-gray-600">
                                <span className="font-medium">Premium:</span>{" "}
                                {item.customizations.toppings.premium}
                              </p>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-gray-800">
                        ₱{item.totalPrice}
                      </p>
                      <p className="text-sm text-gray-500">
                        Qty: {item.quantity}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="border-t mt-4 pt-3 flex justify-between items-center">
                <span className="text-lg font-semibold text-amber-600">Total: ₱{order.total}</span>
                <div className="flex items-center gap-2">
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    order.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                    order.status === 'preparing' ? 'bg-blue-100 text-blue-800' :
                    order.status === 'ready' ? 'bg-green-100 text-green-800' :
                    order.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                    order.status === 'delivered' ? 'bg-green-200 text-green-800' :
                    'bg-gray-100 text-gray-700'
                  }`}>
                    {order.status.toUpperCase()}
                  </span>
                </div>
              </div>
            </div>
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};

export default OrderHistory;
