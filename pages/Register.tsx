import React from "react";
import { Navigate } from "react-router-dom";

const Register: React.FC = () => {
  return <Navigate to="/auth" replace />;
};

export default Register;
