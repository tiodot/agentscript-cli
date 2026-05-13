"""Auto-generated from WeatherPro_Assistant by agentscript-cli.
AgentScope implementation of WeatherPro_Assistant.
"""

from typing import Any

class StateManager:
    """Shared state mirroring AgentScript variables."""

    def __init__(self):
        self.user_city: str = ""  # User's requested city for weather information
        self.user_country: str = ""  # User's requested country for weather information
        self.location_coordinates: dict = {}  # Latitude and longitude coordinates for the location
        self.temperature: int = 0  # Current temperature in Celsius
        self.temperature_fahrenheit: int = 32  # Current temperature in Fahrenheit
        self.conditions: str = ""  # Current weather conditions description
        self.humidity: int = 0  # Current humidity percentage
        self.wind_speed: int = 0  # Current wind speed in km/h
        self.wind_direction: str = ""  # Wind direction (N, NE, E, SE, S, SW, W, NW)
        self.pressure: int = 0  # Atmospheric pressure in hPa
        self.visibility_km: int = 0  # Visibility in kilometers
        self.uv_index: int = 0  # UV index value
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


async def get_current_weather_data(city: str, country: str, coordinates: dict | None = None) -> dict:
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


async def geocode_location(location_query: str) -> dict:
    """Converts city/country names to precise coordinates for weather lookup

    Args:
        location_query: Location search query (city, country)

    Returns:
        dict with keys: coordinates, location_name, timezone

    Target: apex://01pWX000001GeoLocationAPI
    """

    raise NotImplementedError("Action target: apex://01pWX000001GeoLocationAPI")


async def get_weather_alerts_data(city: str, country: str, alert_severity_filter: str | None = None) -> dict:
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


async def get_safety_guidelines(hazard_type: str, severity_level: str) -> dict:
    """Retrieves safety guidelines and recommendations for specific weather hazards

    Args:
        hazard_type: Type of weather hazard (storm, flood, tornado, hurricane, blizzard, etc.)
        severity_level: Severity level of the hazard

    Returns:
        dict with keys: safety_guidelines, evacuation_info, emergency_supplies

    Target: apex://01pWX000003SafetyGuidelinesAPI
    """

    raise NotImplementedError("Action target: apex://01pWX000003SafetyGuidelinesAPI")


async def get_weather_forecast(city: str, country: str, forecast_days: int | None = None, include_hourly: bool | None = None) -> dict:
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


async def update_user_preferences(temperature_units: str | None = None, default_location: dict | None = None, notification_settings: dict | None = None, display_preferences: dict | None = None) -> dict:
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


from agentscope.agent import ReActAgent
from agentscope.message import Msg

class CurrentWeatherServiceWrapper:
    def __init__(self, agent: ReActAgent, state: StateManager):
        self.agent = agent
        self.state = state

    async def __call__(self, msg: Msg) -> Msg:
        await self.before_call(msg)
        result = await self.agent(msg)
        await self.after_call(msg, result)
        return result

    async def before_call(self, msg: Msg) -> None:
        if state.get("user_city") != "" and state.get("user_country") != "":
            result = await get_current_weather_data(city=state.get("user_city"), country=state.get("user_country"))
            state.set("temperature", result["temperature_celsius"])
            state.set("temperature_fahrenheit", result["temperature_fahrenheit"])
            state.set("conditions", result["conditions"])
            state.set("humidity", result["humidity"])
            state.set("wind_speed", result["wind_speed"])
            state.set("wind_direction", result["wind_direction"])
            state.set("pressure", result["pressure"])
            state.set("visibility_km", result["visibility_km"])
            state.set("uv_index", result["uv_index"])

    async def after_call(self, msg: Msg, result: Msg) -> None:
        if state.get("severe_weather_alert"):
            pass  # transition to severe_weather_alerts


from agentscope.agent import ReActAgent
from agentscope.message import Msg

class SevereWeatherAlertsWrapper:
    def __init__(self, agent: ReActAgent, state: StateManager):
        self.agent = agent
        self.state = state

    async def __call__(self, msg: Msg) -> Msg:
        await self.before_call(msg)
        result = await self.agent(msg)
        await self.after_call(msg, result)
        return result

    async def before_call(self, msg: Msg) -> None:
        if state.get("user_city") != "" and state.get("user_country") != "":
            result = await get_weather_alerts_data(city=state.get("user_city"), country=state.get("user_country"))
            state.set("severe_weather_alert", result["alert_count > 0"])
            state.set("alert_severity", result["highest_severity"])
            state.set("alert_type", result["active_alerts[0].type"])

    async def after_call(self, msg: Msg, result: Msg) -> None:
        pass


import os

from agentscope.agent import ReActAgent
from agentscope.formatter import DashScopeChatFormatter
from agentscope.memory import InMemoryMemory
from agentscope.model import DashScopeChatModel
from agentscope.tool import Toolkit

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


import os

from agentscope.agent import ReActAgent
from agentscope.formatter import DashScopeChatFormatter
from agentscope.memory import InMemoryMemory
from agentscope.model import DashScopeChatModel
from agentscope.tool import Toolkit

def create_current_weather_service(state: StateManager, toolkit: Toolkit) -> ReActAgent:
    """Create the current_weather_service agent."""

    sys_prompt = """You are a professional weather data specialist providing accurate current weather conditions. Always include safety information when severe weather is present.


Provide current weather conditions for the user's location.

If @variables.user_city and @variables.user_country are available, call @actions.Get_Current_Weather_Data to fetch comprehensive data.
If location needs geocoding or clarification, call @actions.Geocode_Location first.
When user provides new location details, call @actions.set_location to store the information.

If user asks for forecasts, call @actions.get_forecast to transition to forecast service.
If severe weather is detected, the after_reasoning logic will handle transition to alerts.

Present comprehensive weather data including temperature, conditions, humidity, wind, pressure, visibility, and UV index."""

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


import os

from agentscope.agent import ReActAgent
from agentscope.formatter import DashScopeChatFormatter
from agentscope.memory import InMemoryMemory
from agentscope.model import DashScopeChatModel
from agentscope.tool import Toolkit

def create_severe_weather_alerts(state: StateManager, toolkit: Toolkit) -> ReActAgent:
    """Create the severe_weather_alerts agent."""

    sys_prompt = """You are an emergency weather alert specialist. Prioritize user safety by providing clear, actionable severe weather information and safety guidance. Always emphasize the urgency and importance of following official emergency guidance.


Monitor and respond to weather alerts with safety as the top priority.

If @variables.user_city and @variables.user_country are available, call @actions.Get_Weather_Alerts_Data to retrieve active alerts.
The before_reasoning logic will populate alert variables if alerts are found.

When @variables.severe_weather_alert is true, call @actions.Get_Safety_Guidelines for specific hazard guidance.
If user wants to manage notifications, @actions.update_alert_preferences can update preferences.

Always prioritize safety messaging when @variables.severe_weather_alert is true.
If user needs current conditions, @actions.check_current_conditions can transition to current weather service.
For extended weather tracking, @actions.extended_forecast can transition to forecast service.

Emphasize following official emergency guidance for any severe weather events."""

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


import os

from agentscope.agent import ReActAgent
from agentscope.formatter import DashScopeChatFormatter
from agentscope.memory import InMemoryMemory
from agentscope.model import DashScopeChatModel
from agentscope.tool import Toolkit

def create_forecast_service(state: StateManager, toolkit: Toolkit) -> ReActAgent:
    """Create the forecast_service agent."""

    sys_prompt = """You are a professional weather forecasting specialist providing accurate, detailed weather predictions. Include confidence levels and highlight any significant weather changes.


Deliver comprehensive weather forecasts tailored to user needs.

Call @actions.Get_Weather_Forecast with @variables.user_city and @variables.user_country if available.
Include forecast_days parameter (1-14 days) and set include_hourly flag based on user needs.
Store results in @variables.forecast_data and @variables.hourly_forecast.

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


import os

from agentscope.agent import ReActAgent
from agentscope.formatter import DashScopeChatFormatter
from agentscope.memory import InMemoryMemory
from agentscope.model import DashScopeChatModel
from agentscope.tool import Toolkit

def create_weather_preferences(state: StateManager, toolkit: Toolkit) -> ReActAgent:
    """Create the weather_preferences agent."""

    sys_prompt = """You are a user experience specialist helping users customize their weather information preferences. Make the setup process simple and intuitive.


Help users customize their weather experience through preference management.

Call @actions.Update_User_Preferences to handle temperature_units, default_location, notification_settings, and display_preferences.

Update relevant state variables based on user choices:
- Set @variables.preferred_units from temperature_units selection
- Update @variables.notification_preferences from notification_settings
- Store location in @variables.user_city and @variables.user_country if changed

After updating preferences, @actions.get_weather can transition to apply the new settings immediately.
To return to the main weather services, @actions.main_menu can transition back to the router.

Current preference state: units=@variables.preferred_units, location set=@variables.user_city and @variables.user_country.
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


import asyncio
import os

from agentscope.agent import ReActAgent, UserAgent
from agentscope.formatter import DashScopeChatFormatter
from agentscope.memory import InMemoryMemory
from agentscope.message import Msg
from agentscope.model import DashScopeChatModel
from agentscope.pipeline import MsgHub
from agentscope.tool import Toolkit

async def main():
    state = StateManager()
    toolkit_weather_service_router = Toolkit()
    toolkit_current_weather_service = Toolkit()
    toolkit_severe_weather_alerts = Toolkit()
    toolkit_forecast_service = Toolkit()
    toolkit_weather_preferences = Toolkit()

    weather_service_router = create_weather_service_router(state, toolkit_weather_service_router)
    current_weather_service = create_current_weather_service(state, toolkit_current_weather_service)
    severe_weather_alerts = create_severe_weather_alerts(state, toolkit_severe_weather_alerts)
    forecast_service = create_forecast_service(state, toolkit_forecast_service)
    weather_preferences = create_weather_preferences(state, toolkit_weather_preferences)

    toolkit_current_weather_service.register_tool_function(get_current_weather_data)
    toolkit_current_weather_service.register_tool_function(geocode_location)
    toolkit_severe_weather_alerts.register_tool_function(get_weather_alerts_data)
    toolkit_severe_weather_alerts.register_tool_function(get_safety_guidelines)
    toolkit_forecast_service.register_tool_function(get_weather_forecast)
    toolkit_weather_preferences.register_tool_function(update_user_preferences)

    current_weather_service_wrapped = CurrentWeatherServiceWrapper(current_weather_service, state)
    severe_weather_alerts_wrapped = SevereWeatherAlertsWrapper(severe_weather_alerts, state)

    user = UserAgent(name="user")

    print("Hello! I'm your WeatherPro Assistant. I can provide current weather conditions, forecasts, and severe weather alerts for any location. How can I help you today?")

    msg = None
    while True:
        try:
            msg = await weather_service_router(msg)
        except Exception as e:
            print("I apologize, but I'm experiencing technical difficulties retrieving weather data. Please try again in a moment.")
        msg = await user(msg)
        if msg.get_text_content() == "exit":
            break


if __name__ == "__main__":
    asyncio.run(main())
