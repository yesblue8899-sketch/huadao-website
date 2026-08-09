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

/* 拉美市场进入评估：免费基础自测，输出推荐进入路径 */
(() => {
    const form = document.querySelector("[data-assess-form]");
    const result = document.querySelector("[data-assess-result]");
    if (!form || !result) return;

    const typeLabel = {
        cross: "跨境电商企业",
        brand: "品牌企业",
        supply: "供应链企业",
        other: "其他 / 工贸企业"
    };
    const marketLabel = { mx: "墨西哥", br: "巴西", both: "墨西哥 + 巴西" };
    const stageLabel = {
        research: "仅调研阶段",
        prepare: "准备开店",
        cross: "已在跨境店运营",
        local: "已在本土店运营"
    };
    const pathByMarket = {
        mx: "墨西哥 SA 主体设立 → RFC 税号申请 → 美客多 / TikTok Shop 本土店入驻 → 财税合规托管",
        br: "巴西 CNPJ 主体登记 → 税务（ICMS / IPI）衔接 → 本土平台入驻 → 合规与资料维护",
        both: "墨西哥 SA + 巴西 CNPJ 双主体 → 两国税号与平台资质 → 统一财税合规与履约协同"
    };
    const stageNote = {
        research: "建议从本地主体设立与税号起步，先把合规底座打好。",
        prepare: "建议尽快推进主体与税号，为平台入驻预留前置周期。",
        cross: "已有跨境店，建议尽快平移到本土主体 + 税号，解锁本土店权限与流量。",
        local: "已在本土店运营，建议重点强化财税合规与资料维护，降低经营风险。"
    };

    form.addEventListener("submit", (event) => {
        event.preventDefault();
        const data = new FormData(form);
        const q0 = String(data.get("q0") || "").trim();
        const q1 = String(data.get("q1") || "").trim();
        const q2 = String(data.get("q2") || "").trim();

        if (!q0 || !q1 || !q2) {
            result.textContent = "请完成全部 3 个问题，查看推荐进入路径。";
            return;
        }

        const type = typeLabel[q0] || "企业";
        const market = marketLabel[q1] || "目标市场";
        const stage = stageLabel[q2] || "当前阶段";
        const path = pathByMarket[q1] || "本地主体设立 → 税号衔接 → 平台落地 → 合规经营";
        const note = stageNote[q2] || "";

        result.innerHTML =
            "<strong>推荐进入路径</strong><br>" +
            "企业类型：" + type + "；目标市场：" + market + "；" + stage + "。<br>" +
            "<span style=\"color:var(--color-orange-600);font-weight:700;\">" + path + "</span><br>" +
            note + "<br>" +
            "<span style=\"color:var(--color-muted);font-size:13px;\">填写右侧企业信息，可获取更详细的落地方案与周期清单。</span>";
    });
})();
