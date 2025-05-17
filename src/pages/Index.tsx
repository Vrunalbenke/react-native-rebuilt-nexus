
import { Navigate } from "react-router-dom";

const Index = () => {
  // Redirect to HomePage since we've created a dedicated home page
  return <Navigate to="/" replace />;
};

export default Index;
