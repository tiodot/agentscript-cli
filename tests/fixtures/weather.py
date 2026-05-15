import asyncio
import json
import os

from agentscope.agent import ReActAgent, UserAgent
from agentscope.formatter import DashScopeChatFormatter
from agentscope.memory import InMemoryMemory
from agentscope.message import Msg, TextBlock
from agentscope.model import DashScopeChatModel
from agentscope.tool import ToolResponse, Toolkit
from typing import Any, Callable, Optional

"""Auto-generated from WeatherPro_Assistant by agentscript-cli.
AgentScope implementation of WeatherPro_Assistant.
"""

class StateManager:
    """Shared state mirroring AgentScript variables."""

    def __init__(self):
        self.user_city: str = ""  # User's requested city for weather information
        self.user_country: str = ""  # User's requested country for weather information
        self.location_coordinates: dict = {}  # Latitude and longitude coordinates for the location
        self.temperature: float = 0  # Current temperature in Celsius
        self.temperature_fahrenheit: float = 32  # Current temperature in Fahrenheit
        self.conditions: str = ""  # Current weather conditions description
        self.humidity: float = 0  # Current humidity percentage
        self.wind_speed: float = 0  # Current wind speed in km/h
        self.wind_direction: str = ""  # Wind direction (N, NE, E, SE, S, SW, W, NW)
        self.pressure: float = 0  # Atmospheric pressure in hPa
        self.visibility_km: float = 0  # Visibility in kilometers
        self.uv_index: float = 0  # UV index value
        self.forecast_data: list[dict] = []  # Multi-day weather forecast data
        self.hourly_forecast: list[dict] = []  # 24-hour hourly forecast data
        self.severe_weather_alert: bool = False  # Whether there are active severe weather alerts
        self.alert_type: str = ""  # Type of weather alert (storm, flood, heat, cold, etc.)
        self.alert_severity: str = ""  # Alert severity level (minor, moderate, severe, extreme)
        self.alert_description: str = ""  # Detailed description of the weather alert
        self.alert_expires: str = ""  # When the weather alert expires
        self.preferred_units: str = "metric"  # User's preferred temperature units (metric/imperial)
        self.notification_preferences: dict = {}  # User's weather notification preferences

    def set(self, name: str, value: Any) -> None:
        setattr(self, name, value)

    def get(self, name: str) -> Any:
        return getattr(self, name, None)

async def get_current_weather_data_impl(city: str, country: str, coordinates: dict | None = None) -> dict:
    """Retrieves comprehensive current weather data for a specified location

    Args:
        city: City name for weather lookup
        country: Country name or code for weather lookup
        coordinates: Latitude and longitude coordinates (optional, for precise location)

    Returns:
        dict with keys: temperature_celsius, temperature_fahrenheit, conditions, humidity, wind_speed, wind_direction, pressure, visibility_km, uv_index, weather_alerts

    Target: flow://300WX000001WeatherCurrentAPI
    """

    raise NotImplementedError("Action target: flow://300WX000001WeatherCurrentAPI")

async def get_current_weather_data(city: str, country: str, coordinates: dict | None = None) -> ToolResponse:
    """Retrieves comprehensive current weather data for a specified location"""

    result = await get_current_weather_data_impl(city=city, country=country, coordinates=coordinates)
    return ToolResponse(content=[TextBlock(type="text", text=json.dumps(result))])

async def geocode_location_impl(location_query: str) -> dict:
    """Converts city/country names to precise coordinates for weather lookup

    Args:
        location_query: Location search query (city, country)

    Returns:
        dict with keys: coordinates, location_name, timezone

    Target: apex://01pWX000001GeoLocationAPI
    """

    raise NotImplementedError("Action target: apex://01pWX000001GeoLocationAPI")

async def geocode_location(location_query: str) -> ToolResponse:
    """Converts city/country names to precise coordinates for weather lookup"""

    result = await geocode_location_impl(location_query=location_query)
    return ToolResponse(content=[TextBlock(type="text", text=json.dumps(result))])

async def get_weather_alerts_data_impl(city: str, country: str, alert_severity_filter: str | None = None) -> dict:
    """Retrieves active weather alerts, warnings, and watches for a specified location

    Args:
        city: City name for alert lookup
        country: Country name for alert lookup
        alert_severity_filter: Filter by severity level (minor, moderate, severe, extreme)

    Returns:
        dict with keys: active_alerts, highest_severity, alert_count, emergency_contacts

    Target: flow://300WX000002WeatherAlertsAPI
    """

    raise NotImplementedError("Action target: flow://300WX000002WeatherAlertsAPI")

async def get_weather_alerts_data(city: str, country: str, alert_severity_filter: str | None = None) -> ToolResponse:
    """Retrieves active weather alerts, warnings, and watches for a specified location"""

    result = await get_weather_alerts_data_impl(city=city, country=country, alert_severity_filter=alert_severity_filter)
    return ToolResponse(content=[TextBlock(type="text", text=json.dumps(result))])

async def get_safety_guidelines_impl(hazard_type: str, severity_level: str) -> dict:
    """Retrieves safety guidelines and recommendations for specific weather hazards

    Args:
        hazard_type: Type of weather hazard (storm, flood, tornado, hurricane, blizzard, etc.)
        severity_level: Severity level of the hazard

    Returns:
        dict with keys: safety_guidelines, evacuation_info, emergency_supplies

    Target: apex://01pWX000003SafetyGuidelinesAPI
    """

    raise NotImplementedError("Action target: apex://01pWX000003SafetyGuidelinesAPI")

async def get_safety_guidelines(hazard_type: str, severity_level: str) -> ToolResponse:
    """Retrieves safety guidelines and recommendations for specific weather hazards"""

    result = await get_safety_guidelines_impl(hazard_type=hazard_type, severity_level=severity_level)
    return ToolResponse(content=[TextBlock(type="text", text=json.dumps(result))])

async def get_weather_forecast_impl(city: str, country: str, forecast_days: float | None = None, include_hourly: bool | None = None) -> dict:
    """Retrieves detailed weather forecast data for specified location and timeframe

    Args:
        city: City name for forecast
        country: Country name for forecast
        forecast_days: Number of days to forecast (1-14)
        include_hourly: Include hourly breakdown for first 24-48 hours

    Returns:
        dict with keys: daily_forecast, hourly_forecast, forecast_confidence, weather_trends

    Target: flow://300WX000003WeatherForecastAPI
    """

    raise NotImplementedError("Action target: flow://300WX000003WeatherForecastAPI")

async def get_weather_forecast(city: str, country: str, forecast_days: float | None = None, include_hourly: bool | None = None) -> ToolResponse:
    """Retrieves detailed weather forecast data for specified location and timeframe"""

    result = await get_weather_forecast_impl(city=city, country=country, forecast_days=forecast_days, include_hourly=include_hourly)
    return ToolResponse(content=[TextBlock(type="text", text=json.dumps(result))])

async def update_user_preferences_impl(temperature_units: str | None = None, default_location: dict | None = None, notification_settings: dict | None = None, display_preferences: dict | None = None) -> dict:
    """Updates user's weather display and notification preferences

    Args:
        temperature_units: Preferred temperature units (celsius/fahrenheit)
        default_location: User's default location for weather information
        notification_settings: Weather alert notification preferences
        display_preferences: Weather information display preferences

    Returns:
        dict with keys: preferences_updated, current_settings

    Target: apex://01pWX000004UserPreferencesAPI
    """

    raise NotImplementedError("Action target: apex://01pWX000004UserPreferencesAPI")

async def update_user_preferences(temperature_units: str | None = None, default_location: dict | None = None, notification_settings: dict | None = None, display_preferences: dict | None = None) -> ToolResponse:
    """Updates user's weather display and notification preferences"""

    result = await update_user_preferences_impl(temperature_units=temperature_units, default_location=default_location, notification_settings=notification_settings, display_preferences=display_preferences)
    return ToolResponse(content=[TextBlock(type="text", text=json.dumps(result))])

class CurrentWeatherServiceWrapper:
    def __init__(self, agent: ReActAgent, state: StateManager, resolve_impl=None):
        self.agent = agent
        self.state = state
        self._resolve_impl = resolve_impl
        self.next_agent = None

    async def __call__(self, msg: Msg) -> Msg:
        await self.before_call(msg)
        result = await self.agent(msg)
        try:
            await self.after_call(msg, result)
        except NotImplementedError:
            pass  # unimplemented action stubs — result still returned
        return result

    async def before_call(self, msg: Msg) -> None:
        if self.state.get("user_city") != "" and self.state.get("user_country") != "":
            result = await self._resolve_impl("get_current_weather_data", **{"city": self.state.get("user_city"), "country": self.state.get("user_country")})
            self.state.set("temperature", result["temperature_celsius"])
            self.state.set("temperature_fahrenheit", result["temperature_fahrenheit"])
            self.state.set("conditions", result["conditions"])
            self.state.set("humidity", result["humidity"])
            self.state.set("wind_speed", result["wind_speed"])
            self.state.set("wind_direction", result["wind_direction"])
            self.state.set("pressure", result["pressure"])
            self.state.set("visibility_km", result["visibility_km"])
            self.state.set("uv_index", result["uv_index"])

    async def after_call(self, msg: Msg, result: Msg) -> None:
        if self.state.get("severe_weather_alert"):
            self.next_agent = "severe_weather_alerts"

class SevereWeatherAlertsWrapper:
    def __init__(self, agent: ReActAgent, state: StateManager, resolve_impl=None):
        self.agent = agent
        self.state = state
        self._resolve_impl = resolve_impl
        self.next_agent = None

    async def __call__(self, msg: Msg) -> Msg:
        await self.before_call(msg)
        result = await self.agent(msg)
        try:
            await self.after_call(msg, result)
        except NotImplementedError:
            pass  # unimplemented action stubs — result still returned
        return result

    async def before_call(self, msg: Msg) -> None:
        if self.state.get("user_city") != "" and self.state.get("user_country") != "":
            result = await self._resolve_impl("get_weather_alerts_data", **{"city": self.state.get("user_city"), "country": self.state.get("user_country")})
            self.state.set("severe_weather_alert", result["alert_count"] > 0)
            self.state.set("alert_severity", result["highest_severity"])
            self.state.set("alert_type", result["active_alerts"][0].type)

    async def after_call(self, msg: Msg, result: Msg) -> None:
        pass

def create_weather_service_router(state: StateManager, toolkit: Toolkit) -> ReActAgent:
    """Create the weather_service_router agent."""

    sys_prompt = """You are a professional weather service assistant. Analyze user requests and route them to the appropriate weather service. Always prioritize safety by directing users with severe weather concerns to emergency alerts first.


Analyze user input to determine weather service intent and route appropriately:
- For current weather requests, call @actions.current_weather
- For forecast or future weather requests, call @actions.weather_forecast
- For alerts, emergencies, or safety concerns, call @actions.emergency_alerts
- For settings, preferences, or unit changes, call @actions.user_settings

Welcome users professionally and gather location information if not provided."""

    return ReActAgent(
        name="weather_service_router",
        sys_prompt=sys_prompt,
        model=DashScopeChatModel(
            model_name="qwen3.6-flash",
            api_key=os.environ["DASHSCOPE_API_KEY"],
            stream=True,
            enable_thinking=False,
            multimodality=True,
        ),
        memory=InMemoryMemory(),
        formatter=DashScopeChatFormatter(),
        toolkit=toolkit,
    )

def create_current_weather_service(state: StateManager, toolkit: Toolkit) -> ReActAgent:
    """Create the current_weather_service agent."""

    sys_prompt = f"""You are a professional weather data specialist providing accurate current weather conditions. Always include safety information when severe weather is present.


Provide current weather conditions for the user's location.

If {state.get("user_city")} and {state.get("user_country")} are available, call @actions.Get_Current_Weather_Data to fetch comprehensive data.
If location needs geocoding or clarification, call @actions.Geocode_Location first.
When user provides new location details, call @actions.set_location to store the information.

If user asks for forecasts, call @actions.get_forecast to transition to forecast service.
If severe weather is detected, the after_reasoning logic will handle transition to alerts.

Present comprehensive weather data including temperature, conditions, humidity, wind, pressure, visibility, and UV index.
CRITICAL: Whenever the user provides any of the following values — user_city, user_country — you MUST immediately call _set_variables_current_weather_service(user_city=<value>, user_country=<value>) to save them before calling any other tool. Do NOT skip this step."""

    return ReActAgent(
        name="current_weather_service",
        sys_prompt=sys_prompt,
        model=DashScopeChatModel(
            model_name="qwen3.6-flash",
            api_key=os.environ["DASHSCOPE_API_KEY"],
            stream=True,
            enable_thinking=False,
            multimodality=True,
        ),
        memory=InMemoryMemory(),
        formatter=DashScopeChatFormatter(),
        toolkit=toolkit,
    )

def create_severe_weather_alerts(state: StateManager, toolkit: Toolkit) -> ReActAgent:
    """Create the severe_weather_alerts agent."""

    sys_prompt = f"""You are an emergency weather alert specialist. Prioritize user safety by providing clear, actionable severe weather information and safety guidance. Always emphasize the urgency and importance of following official emergency guidance.


Monitor and respond to weather alerts with safety as the top priority.

If {state.get("user_city")} and {state.get("user_country")} are available, call @actions.Get_Weather_Alerts_Data to retrieve active alerts.
The before_reasoning logic will populate alert variables if alerts are found.

When {state.get("severe_weather_alert")} is true, call @actions.Get_Safety_Guidelines for specific hazard guidance.
If user wants to manage notifications, @actions.update_alert_preferences can update preferences.

Always prioritize safety messaging when {state.get("severe_weather_alert")} is true.
If user needs current conditions, @actions.check_current_conditions can transition to current weather service.
For extended weather tracking, @actions.extended_forecast can transition to forecast service.

Emphasize following official emergency guidance for any severe weather events.
CRITICAL: Whenever the user provides any of the following values — notification_preferences — you MUST immediately call _set_variables_severe_weather_alerts(notification_preferences=<value>) to save them before calling any other tool. Do NOT skip this step."""

    return ReActAgent(
        name="severe_weather_alerts",
        sys_prompt=sys_prompt,
        model=DashScopeChatModel(
            model_name="qwen3.6-flash",
            api_key=os.environ["DASHSCOPE_API_KEY"],
            stream=True,
            enable_thinking=False,
            multimodality=True,
        ),
        memory=InMemoryMemory(),
        formatter=DashScopeChatFormatter(),
        toolkit=toolkit,
    )

def create_forecast_service(state: StateManager, toolkit: Toolkit) -> ReActAgent:
    """Create the forecast_service agent."""

    sys_prompt = f"""You are a professional weather forecasting specialist providing accurate, detailed weather predictions. Include confidence levels and highlight any significant weather changes.


Deliver comprehensive weather forecasts tailored to user needs.

Call @actions.Get_Weather_Forecast with {state.get("user_city")} and {state.get("user_country")} if available.
Include forecast_days parameter (1-14 days) and set include_hourly flag based on user needs.
Store results in {state.get("forecast_data")} and {state.get("hourly_forecast")}.

Present multi-day forecasts showing daily conditions, high/low temperatures, precipitation chances, and wind information.
Always include forecast confidence level and highlight notable weather trends.

If user also wants current conditions, @actions.current_conditions can transition to current weather service.
If severe weather is detected in forecast data, @actions.alert_monitoring can transition to alerts.

Gather missing preferences when needed: number of days, hourly details, or location clarification."""

    return ReActAgent(
        name="forecast_service",
        sys_prompt=sys_prompt,
        model=DashScopeChatModel(
            model_name="qwen3.6-flash",
            api_key=os.environ["DASHSCOPE_API_KEY"],
            stream=True,
            enable_thinking=False,
            multimodality=True,
        ),
        memory=InMemoryMemory(),
        formatter=DashScopeChatFormatter(),
        toolkit=toolkit,
    )

def create_weather_preferences(state: StateManager, toolkit: Toolkit) -> ReActAgent:
    """Create the weather_preferences agent."""

    sys_prompt = f"""You are a user experience specialist helping users customize their weather information preferences. Make the setup process simple and intuitive.


Help users customize their weather experience through preference management.

Call @actions.Update_User_Preferences to handle temperature_units, default_location, notification_settings, and display_preferences.

Update relevant state variables based on user choices:
- Set {state.get("preferred_units")} from temperature_units selection
- Update {state.get("notification_preferences")} from notification_settings
- Store location in {state.get("user_city")} and {state.get("user_country")} if changed

After updating preferences, @actions.get_weather can transition to apply the new settings immediately.
To return to the main weather services, @actions.main_menu can transition back to the router.

Current preference state: units={state.get("preferred_units")}, location set={state.get("user_city")} and {state.get("user_country")}.
Gather missing preferences: temperature units (celsius/fahrenheit), default location, alert notifications, display format."""

    return ReActAgent(
        name="weather_preferences",
        sys_prompt=sys_prompt,
        model=DashScopeChatModel(
            model_name="qwen3.6-flash",
            api_key=os.environ["DASHSCOPE_API_KEY"],
            stream=True,
            enable_thinking=False,
            multimodality=True,
        ),
        memory=InMemoryMemory(),
        formatter=DashScopeChatFormatter(),
        toolkit=toolkit,
    )

class WeatherProAssistantBot:
    """Auto-generated bot class. Supports package import and CLI execution.

    Usage::

        bot = WeatherProAssistantBot(impls={
            "verify_customer_identity": my_verify_fn,
            ...
        })
        response = await bot.chat("Hello, I need help")
    """

    def __init__(self, impls: dict[str, Callable] | None = None):
        self.state = StateManager()
        self._impls = impls or {}
        self._current_agent_name = "weather_service_router"
        self._agents: dict = {}
        self._pending_transition: str | None = None
        self._build_agents()

    async def _resolve_impl(self, name: str, **kwargs):
        if name in self._impls:
            return await self._impls[name](**kwargs)
        raise NotImplementedError(
            f"No implementation for '{name}'. Pass via impls={{'{name}': your_fn}}."
        )

    def _build_agents(self):
        toolkit_weather_service_router = Toolkit()
        toolkit_current_weather_service = Toolkit()
        toolkit_severe_weather_alerts = Toolkit()
        toolkit_forecast_service = Toolkit()
        toolkit_weather_preferences = Toolkit()

        weather_service_router_agent = create_weather_service_router(self.state, toolkit_weather_service_router)
        current_weather_service_agent = create_current_weather_service(self.state, toolkit_current_weather_service)
        severe_weather_alerts_agent = create_severe_weather_alerts(self.state, toolkit_severe_weather_alerts)
        forecast_service_agent = create_forecast_service(self.state, toolkit_forecast_service)
        weather_preferences_agent = create_weather_preferences(self.state, toolkit_weather_preferences)

        _state_current_weather_service = self.state
        async def Get_Current_Weather_Data() -> ToolResponse:
            """Retrieves comprehensive current weather data for a specified location"""
            result = await self._resolve_impl(
                "get_current_weather_data",
                city=_state_current_weather_service.get("user_city"),
                country=_state_current_weather_service.get("user_country"),
            )
            _state_current_weather_service.set("temperature", result["temperature_celsius"])
            _state_current_weather_service.set("temperature_fahrenheit", result["temperature_fahrenheit"])
            _state_current_weather_service.set("conditions", result["conditions"])
            _state_current_weather_service.set("humidity", result["humidity"])
            _state_current_weather_service.set("wind_speed", result["wind_speed"])
            _state_current_weather_service.set("wind_direction", result["wind_direction"])
            _state_current_weather_service.set("pressure", result["pressure"])
            _state_current_weather_service.set("visibility_km", result["visibility_km"])
            _state_current_weather_service.set("uv_index", result["uv_index"])
            return ToolResponse(content=[TextBlock(type="text", text=json.dumps(result))])
        toolkit_current_weather_service.register_tool_function(Get_Current_Weather_Data)

        _state_current_weather_service = self.state
        async def Geocode_Location() -> ToolResponse:
            """Converts city/country names to precise coordinates for weather lookup"""
            result = await self._resolve_impl(
                "geocode_location",
                location_query=[object Object],
            )
            _state_current_weather_service.set("location_coordinates", result["coordinates"])
            return ToolResponse(content=[TextBlock(type="text", text=json.dumps(result))])
        toolkit_current_weather_service.register_tool_function(Geocode_Location)

        _state_severe_weather_alerts = self.state
        async def Get_Weather_Alerts_Data() -> ToolResponse:
            """Retrieves active weather alerts, warnings, and watches for a specified location"""
            result = await self._resolve_impl(
                "get_weather_alerts_data",
                city=_state_severe_weather_alerts.get("user_city"),
                country=_state_severe_weather_alerts.get("user_country"),
            )
            _state_severe_weather_alerts.set("severe_weather_alert", result["alert_count > 0"])
            _state_severe_weather_alerts.set("alert_severity", result["highest_severity"])
            _state_severe_weather_alerts.set("alert_type", result["active_alerts[0].type"])
            return ToolResponse(content=[TextBlock(type="text", text=json.dumps(result))])
        toolkit_severe_weather_alerts.register_tool_function(Get_Weather_Alerts_Data)

        _state_severe_weather_alerts = self.state
        async def Get_Safety_Guidelines() -> ToolResponse:
            """Retrieves safety guidelines and recommendations for specific weather hazards"""
            result = await self._resolve_impl(
                "get_safety_guidelines",
                hazard_type=_state_severe_weather_alerts.get("alert_type"),
                severity_level=_state_severe_weather_alerts.get("alert_severity"),
            )
            return ToolResponse(content=[TextBlock(type="text", text=json.dumps(result))])
        toolkit_severe_weather_alerts.register_tool_function(Get_Safety_Guidelines)

        _state_forecast_service = self.state
        async def Get_Weather_Forecast() -> ToolResponse:
            """Retrieves detailed weather forecast data for specified location and timeframe"""
            result = await self._resolve_impl(
                "get_weather_forecast",
                city=_state_forecast_service.get("user_city"),
                country=_state_forecast_service.get("user_country"),
                forecast_days=[object Object],
                include_hourly=[object Object],
            )
            _state_forecast_service.set("forecast_data", result["daily_forecast"])
            _state_forecast_service.set("hourly_forecast", result["hourly_forecast"])
            return ToolResponse(content=[TextBlock(type="text", text=json.dumps(result))])
        toolkit_forecast_service.register_tool_function(Get_Weather_Forecast)

        _state_weather_preferences = self.state
        async def Update_User_Preferences() -> ToolResponse:
            """Updates user's weather display and notification preferences"""
            result = await self._resolve_impl(
                "update_user_preferences",
                temperature_units=[object Object],
                default_location=[object Object],
                notification_settings=[object Object],
                display_preferences=[object Object],
            )
            _state_weather_preferences.set("preferred_units", result["current_settings.temperature_units"])
            _state_weather_preferences.set("notification_preferences", result["current_settings.notifications"])
            return ToolResponse(content=[TextBlock(type="text", text=json.dumps(result))])
        toolkit_weather_preferences.register_tool_function(Update_User_Preferences)

        _bot_ref_weather_service_router_current_weather = self
        async def current_weather() -> ToolResponse:
            """Route to current weather service when users ask for current conditions, temperature, or immediate weather status."""
            _bot_ref_weather_service_router_current_weather._pending_transition = "current_weather_service"
            return ToolResponse(content=[TextBlock(type="text", text='{"transitioning": true}')])
        toolkit_weather_service_router.register_tool_function(current_weather)

        _bot_ref_weather_service_router_weather_forecast = self
        async def weather_forecast() -> ToolResponse:
            """Route to forecast service when users ask for future weather predictions, multi-day forecasts, or planning information."""
            _bot_ref_weather_service_router_weather_forecast._pending_transition = "forecast_service"
            return ToolResponse(content=[TextBlock(type="text", text='{"transitioning": true}')])
        toolkit_weather_service_router.register_tool_function(weather_forecast)

        _bot_ref_weather_service_router_emergency_alerts = self
        async def emergency_alerts() -> ToolResponse:
            """Route to severe weather alerts when users mention storms, warnings, emergencies, or safety concerns."""
            _bot_ref_weather_service_router_emergency_alerts._pending_transition = "severe_weather_alerts"
            return ToolResponse(content=[TextBlock(type="text", text='{"transitioning": true}')])
        toolkit_weather_service_router.register_tool_function(emergency_alerts)

        _bot_ref_weather_service_router_user_settings = self
        async def user_settings() -> ToolResponse:
            """Route to preferences when users want to set temperature units, location defaults, or notification settings."""
            _bot_ref_weather_service_router_user_settings._pending_transition = "weather_preferences"
            return ToolResponse(content=[TextBlock(type="text", text='{"transitioning": true}')])
        toolkit_weather_service_router.register_tool_function(user_settings)

        _bot_ref_current_weather_service_get_forecast = self
        async def get_forecast() -> ToolResponse:
            """Get detailed weather forecast for the current location."""
            _bot_ref_current_weather_service_get_forecast._pending_transition = "forecast_service"
            return ToolResponse(content=[TextBlock(type="text", text='{"transitioning": true}')])
        toolkit_current_weather_service.register_tool_function(get_forecast)

        _bot_ref_current_weather_service_check_alerts = self
        async def check_alerts() -> ToolResponse:
            """Check for severe weather alerts in the area."""
            _bot_ref_current_weather_service_check_alerts._pending_transition = "severe_weather_alerts"
            return ToolResponse(content=[TextBlock(type="text", text='{"transitioning": true}')])
        toolkit_current_weather_service.register_tool_function(check_alerts)

        _bot_ref_severe_weather_alerts_check_current_conditions = self
        async def check_current_conditions() -> ToolResponse:
            """Check current weather conditions after reviewing alerts."""
            _bot_ref_severe_weather_alerts_check_current_conditions._pending_transition = "current_weather_service"
            return ToolResponse(content=[TextBlock(type="text", text='{"transitioning": true}')])
        toolkit_severe_weather_alerts.register_tool_function(check_current_conditions)

        _bot_ref_severe_weather_alerts_extended_forecast = self
        async def extended_forecast() -> ToolResponse:
            """Get extended forecast to track severe weather progression."""
            _bot_ref_severe_weather_alerts_extended_forecast._pending_transition = "forecast_service"
            return ToolResponse(content=[TextBlock(type="text", text='{"transitioning": true}')])
        toolkit_severe_weather_alerts.register_tool_function(extended_forecast)

        _bot_ref_forecast_service_current_conditions = self
        async def current_conditions() -> ToolResponse:
            """Check current weather conditions alongside the forecast."""
            _bot_ref_forecast_service_current_conditions._pending_transition = "current_weather_service"
            return ToolResponse(content=[TextBlock(type="text", text='{"transitioning": true}')])
        toolkit_forecast_service.register_tool_function(current_conditions)

        _bot_ref_forecast_service_alert_monitoring = self
        async def alert_monitoring() -> ToolResponse:
            """Monitor for any severe weather in the forecast period."""
            _bot_ref_forecast_service_alert_monitoring._pending_transition = "severe_weather_alerts"
            return ToolResponse(content=[TextBlock(type="text", text='{"transitioning": true}')])
        toolkit_forecast_service.register_tool_function(alert_monitoring)

        _bot_ref_weather_preferences_get_weather = self
        async def get_weather() -> ToolResponse:
            """Get weather information with updated preferences."""
            _bot_ref_weather_preferences_get_weather._pending_transition = "current_weather_service"
            return ToolResponse(content=[TextBlock(type="text", text='{"transitioning": true}')])
        toolkit_weather_preferences.register_tool_function(get_weather)

        _bot_ref_weather_preferences_main_menu = self
        async def main_menu() -> ToolResponse:
            """Return to main weather service menu."""
            _bot_ref_weather_preferences_main_menu._pending_transition = "weather_service_router"
            return ToolResponse(content=[TextBlock(type="text", text='{"transitioning": true}')])
        toolkit_weather_preferences.register_tool_function(main_menu)

        _captured_state_current_weather_service = self.state
        async def _set_variables_current_weather_service(user_city: str | None = None, user_country: str | None = None):
            """Set state variables for the current_weather_service agent.

            Args:
                user_city: User's requested city for weather information
                user_country: User's requested country for weather information
            """
            _captured_state = _captured_state_current_weather_service
            if user_city is not None: _captured_state.set("user_city", user_city)
            if user_country is not None: _captured_state.set("user_country", user_country)
            return ToolResponse(content=[TextBlock(type="text", text='{"ok": true}')])
        toolkit_current_weather_service.register_tool_function(_set_variables_current_weather_service)
        _captured_state_severe_weather_alerts = self.state
        async def _set_variables_severe_weather_alerts(notification_preferences: str | None = None):
            """Set state variables for the severe_weather_alerts agent.

            Args:
                notification_preferences: User's weather notification preferences
            """
            _captured_state = _captured_state_severe_weather_alerts
            if notification_preferences is not None: _captured_state.set("notification_preferences", notification_preferences)
            return ToolResponse(content=[TextBlock(type="text", text='{"ok": true}')])
        toolkit_severe_weather_alerts.register_tool_function(_set_variables_severe_weather_alerts)
        current_weather_service_wrapped = CurrentWeatherServiceWrapper(current_weather_service_agent, self.state, self._resolve_impl)
        severe_weather_alerts_wrapped = SevereWeatherAlertsWrapper(severe_weather_alerts_agent, self.state, self._resolve_impl)

        self._agents = {"weather_service_router": weather_service_router_agent, "current_weather_service": current_weather_service_wrapped, "severe_weather_alerts": severe_weather_alerts_wrapped, "forecast_service": forecast_service_agent, "weather_preferences": weather_preferences_agent}

    async def chat(self, user_message: str) -> str:
        """Send a message and get a response. Maintains conversation state across calls."""
        msg = Msg(name="user", content=user_message, role="user")
        while True:
            agent = self._agents[self._current_agent_name]
            try:
                result = await agent(msg)
            except NotImplementedError:
                raise
            except Exception as e:
                return "I apologize, but I'm experiencing technical difficulties retrieving weather data. Please try again in a moment."
            if self._pending_transition:
                self._current_agent_name = self._pending_transition
                self._pending_transition = None
                msg = result
                continue
            if hasattr(agent, "next_agent") and agent.next_agent:
                self._current_agent_name = agent.next_agent
                agent.next_agent = None
                msg = result
                continue
            return result.get_text_content() if hasattr(result, "get_text_content") else str(result)

    def reset(self):
        """Reset state and restart from the beginning (new session)."""
        self.state = StateManager()
        self._current_agent_name = "weather_service_router"
        self._pending_transition = None
        self._build_agents()

    async def run_cli(self):
        """Interactive CLI loop (replaces old main())."""
        print("Hello! I'm your WeatherPro Assistant. I can provide current weather conditions, forecasts, and severe weather alerts for any location. How can I help you today?")
        while True:
            user_input = input("You: ").strip()
            if user_input.lower() in ("exit", "quit"):
                break
            response = await self.chat(user_input)
            print(f"Bot: {response}")


if __name__ == "__main__":
    _impls = {"get_current_weather_data": get_current_weather_data_impl, "geocode_location": geocode_location_impl, "get_weather_alerts_data": get_weather_alerts_data_impl, "get_safety_guidelines": get_safety_guidelines_impl, "get_weather_forecast": get_weather_forecast_impl, "update_user_preferences": update_user_preferences_impl}
    asyncio.run(WeatherProAssistantBot(impls=_impls).run_cli())
