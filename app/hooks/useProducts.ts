import { useEffect, useState } from "react";
import Qonversion, { Product } from "@qonversion/react-native-sdk";

export function useProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const result = await Qonversion.getSharedInstance().products();

        console.log("🟣 QONVERSION PRODUCTS MAP →", result);

        const list = Array.from(result.values());

        console.log("🟣 QONVERSION PRODUCT LIST →", list);

        setProducts(list);
      } catch (e) {
        console.log("Failed to load products:", e);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  return { products, loading };
}
