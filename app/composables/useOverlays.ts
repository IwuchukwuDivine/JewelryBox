/**
 * The three global overlays — menu, search and bag.
 *
 * Mirrors the prototype's state model: these are booleans on the shell, not
 * routes, so opening the bag never loses the page underneath. Shared via
 * `useState` so the header, the mobile nav and any page can drive them.
 *
 * Only one may be open at a time; opening one closes the others.
 */
export default () => {
  const menuOpen = useState("overlay-menu", () => false);
  const searchOpen = useState("overlay-search", () => false);
  const cartOpen = useState("overlay-cart", () => false);

  const closeAll = () => {
    menuOpen.value = false;
    searchOpen.value = false;
    cartOpen.value = false;
  };

  const open = (which: "menu" | "search" | "cart") => {
    closeAll();
    if (which === "menu") menuOpen.value = true;
    if (which === "search") searchOpen.value = true;
    if (which === "cart") cartOpen.value = true;
  };

  return { menuOpen, searchOpen, cartOpen, open, closeAll };
};
