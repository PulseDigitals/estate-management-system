import postcss from "postcss";
import tailwind from "tailwindcss";
import autoprefixer from "autoprefixer";

export default {
  plugins: [
    tailwind(),
    autoprefixer(),
  ],
  options: {
    from: undefined,  // ← this removes the warning
  },
};
