import "./样式/变量.css";
import "./样式/基础.css";
import "./样式/应用.css";
import "@fontsource-variable/inter";
import "@fontsource-variable/jetbrains-mono";

import React from "react";
import ReactDOM from "react-dom/client";

import 应用 from "./应用";
import { 错误边界 } from "./组件/错误边界";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <错误边界 儿童={<应用 />} />
  </React.StrictMode>,
);
