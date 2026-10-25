"""
ColabBot - Flagship AI Canvas Companion & Active Workflow Agent for ComfyUI

A native ComfyUI custom node extension that embeds an intelligent,
Apple HIG-inspired frosted-glass assistant directly inside your canvas.
Provides live node graph inspection, Gemini 2.5 Flash tool calling
(addNode, connectNodes, setWidgetValue, removeNode, disconnectSlot),
1-click node camera centering, and WebSocket/HTTP execution hooks.
"""

import os
import json
import logging

# ComfyUI serves frontend extensions from this directory automatically
WEB_DIRECTORY = "./web"

NODE_CLASS_MAPPINGS = {}
NODE_DISPLAY_NAME_MAPPINGS = {}

# Register HTTP API endpoints and WebSocket hooks if running inside ComfyUI server
try:
    from server import PromptServer
    from aiohttp import web

    routes = PromptServer.instance.routes

    @routes.post("/colabbot/execute_tool")
    async def execute_tool_endpoint(request):
        """
        Receives graph modification tool calls from Python backend, API scripts,
        or external agents and broadcasts them via WebSocket to the live ComfyUI canvas tab.
        """
        try:
            data = await request.json()
            tool_name = data.get("tool")
            args = data.get("args", {})
            if not tool_name:
                return web.json_response({"success": False, "error": "Missing 'tool' parameter."}, status=400)

            # Broadcast to active browser sessions
            PromptServer.instance.send_sync("colabbot_graph_action", {
                "tool": tool_name,
                "args": args
            })
            return web.json_response({
                "success": True,
                "message": f"Dispatched '{tool_name}' tool execution to live ComfyUI browser canvas."
            })
        except Exception as err:
            return web.json_response({"success": False, "error": str(err)}, status=500)

    @routes.get("/colabbot/status")
    async def status_endpoint(request):
        return web.json_response({
            "status": "online",
            "version": "2.1.0",
            "capabilities": [
                "active_graph_agent",
                "gemini_function_calling",
                "live_canvas_inspection",
                "websocket_action_bridge"
            ]
        })

except ImportError:
    # Gracefully continue if running in standalone testing or setup environment
    pass

__all__ = ["NODE_CLASS_MAPPINGS", "NODE_DISPLAY_NAME_MAPPINGS", "WEB_DIRECTORY"]
