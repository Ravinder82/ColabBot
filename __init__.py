"""
ColabBot - Flagship AI Canvas Companion & Workflow Tutor for ComfyUI

A native ComfyUI custom node extension that embeds an intelligent,
Apple HIG-inspired frosted-glass assistant directly inside your canvas.
Provides live node graph inspection, missing model detection, red error node
diagnostics, 1-click node camera centering, and Gemini 2.0 / 1.5 Flash conversational reasoning.
"""

import os

# Tell ComfyUI to automatically load and serve frontend extensions from the web directory
WEB_DIRECTORY = "./web"

# Node mappings (pure frontend companion extension with optional status node)
NODE_CLASS_MAPPINGS = {}
NODE_DISPLAY_NAME_MAPPINGS = {}

__all__ = ["NODE_CLASS_MAPPINGS", "NODE_DISPLAY_NAME_MAPPINGS", "WEB_DIRECTORY"]
