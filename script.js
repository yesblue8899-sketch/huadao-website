(() => {
    const header = document.querySelector("[data-header]");
    const toggle = document.querySelector("[data-nav-toggle]");
    const nav = document.querySelector("[data-nav]");
    const navLinks = nav ? Array.from(nav.querySelectorAll("a")) : [];
    const consultToggle = document.querySelector("[data-consult-toggle]");
    const consultPopover = document.querySelector("[data-consult-popover]");
    const contactForm = document.querySelector("[data-contact-form]");
    const contactSubmit = document.querySelector("[data-contact-submit]");
    const contactStatus = document.querySelector("[data-contact-status]");
    const contactApiUrl = "https://api.huadaoguoji.com/api/contact";

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

    if (consultToggle && consultPopover) {
        consultToggle.addEventListener("click", (event) => {
            event.stopPropagation();
            consultPopover.hidden = !consultPopover.hidden;
        });

        document.addEventListener("click", (event) => {
            if (!consultPopover.hidden && !consultPopover.contains(event.target) && !consultToggle.contains(event.target)) {
                consultPopover.hidden = true;
            }
        });

        document.addEventListener("keydown", (event) => {
            if (event.key === "Escape") consultPopover.hidden = true;
        });
    }

    if (contactForm) {
        contactForm.addEventListener("submit", async (event) => {
            event.preventDefault();

            const formData = new FormData(contactForm);
            const payload = {
                company: String(formData.get("company") || "").trim(),
                name: String(formData.get("name") || "").trim(),
                contact: String(formData.get("contact") || "").trim(),
                market: String(formData.get("market") || "").trim(),
                message: String(formData.get("message") || "").trim()
            };

            if (!payload.name || !payload.contact || !payload.market || !payload.message) {
                if (contactStatus) {
                    contactStatus.textContent = "请填写联系人、联系方式、目标市场和咨询需求";
                    contactStatus.className = "form-status is-error";
                }
                return;
            }

            if (contactSubmit) {
                contactSubmit.disabled = true;
                contactSubmit.textContent = "提交中...";
            }

            if (contactStatus) {
                contactStatus.textContent = "";
                contactStatus.className = "form-status";
            }

            try {
                const response = await fetch(contactApiUrl, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify(payload)
                });

                if (!response.ok) throw new Error("Request failed");

                contactForm.reset();
                if (contactStatus) {
                    contactStatus.textContent = "提交成功，我们会尽快联系您";
                    contactStatus.className = "form-status is-success";
                }
            } catch (error) {
                if (contactStatus) {
                    contactStatus.textContent = "提交失败，请稍后重试";
                    contactStatus.className = "form-status is-error";
                }
            } finally {
                if (contactSubmit) {
                    contactSubmit.disabled = false;
                    contactSubmit.textContent = "提交咨询";
                }
            }
        });
    }

    setHeaderState();
    window.addEventListener("scroll", setHeaderState, { passive: true });
})();
