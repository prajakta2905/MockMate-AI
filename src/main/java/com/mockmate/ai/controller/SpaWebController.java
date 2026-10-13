package com.mockmate.ai.controller;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

@Controller
public class SpaWebController {

    /**
     * Forwards any Single Page Application (SPA) route to index.html,
     * while preserving all /api/** REST endpoints and static file requests.
     */
    @GetMapping(value = {
            "/",
            "/{path:[^\\.]*}"
    })
    public String forwardSpaRoutes() {
        return "forward:/index.html";
    }
}
