(() => {
    const header = document.querySelector("[data-header]");
    const toggle = document.querySelector("[data-nav-toggle]");
    const nav = document.querySelector("[data-nav]");
    const navLinks = nav ? Array.from(nav.querySelectorAll("a")) : [];

    const setHeaderState = () => {
        if (!header) return;
        header.classList.toggle("is-scrolled", window.scrollY > 8);
    };

    const closeNav = () => {
        if (!toggle || !nav) return;
        toggle.classList.remove("is-open");
        nav.classList.remove("is-open");
        toggle.setAttribute("aria-expanded", "false");
        toggle.setAttribute("aria-label", "打开导航菜单");
    };

    if (toggle && nav) {
        toggle.addEventListener("click", () => {
            const isOpen = toggle.classList.toggle("is-open");
            nav.classList.toggle("is-open", isOpen);
            toggle.setAttribute("aria-expanded", String(isOpen));
            toggle.setAttribute("aria-label", isOpen ? "关闭导航菜单" : "打开导航菜单");
        });

        navLinks.forEach((link) => {
            link.addEventListener("click", closeNav);
        });

        document.addEventListener("keydown", (event) => {
            if (event.key === "Escape") closeNav();
        });
    }

    setHeaderState();
    window.addEventListener("scroll", setHeaderState, { passive: true });
})();
