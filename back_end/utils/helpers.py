import numpy as np
from datetime import time as _time
import datetime


def convert_numpy_types(data):
    if isinstance(data, dict):
        return {key: convert_numpy_types(value) for key, value in data.items()}
    elif isinstance(data, list):
        return [convert_numpy_types(item) for item in data]
    elif isinstance(data, np.int64):
        return int(data)
    elif isinstance(data, np.float64):
        return float(data)
    else:
        return data
    
def is_open_on(opening_hours: dict, target_date: datetime.date, target_time: _time=None) -> bool:

    periods = opening_hours.get("periods", [])
    gwday = (target_date.weekday() + 1) % 7

    for p in periods:
        if p["open"]["day"] != gwday:
            continue

        if not target_time:
            return True

        ot, ct = p["open"]["time"], p["close"]["time"]
        open_t = _time(int(ot[:2]), int(ot[2:]))
        close_t = _time(int(ct[:2]), int(ct[2:]))

        # normal span
        if open_t <= close_t:
            if open_t <= target_time <= close_t:
                return True
        else:
            # overnight span
            if target_time >= open_t or target_time <= close_t:
                return True

    return False