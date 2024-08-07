import { Injectable } from "@nestjs/common";

import {
  transformApiEventTypeBookingFields,
  transformApiEventTypeLocations,
} from "@calcom/platform-libraries-0.0.22";
import {
  transformApiEventTypeIntervalLimits,
  transformApiEventTypeFutureBookingLimits,
} from "@calcom/platform-libraries-1.2.3";
import { CreateEventTypeInput_2024_06_14, UpdateEventTypeInput_2024_06_14 } from "@calcom/platform-types";

@Injectable()
export class InputEventTypesService_2024_06_14 {
  transformInputCreateEventType(inputEventType: CreateEventTypeInput_2024_06_14) {
    const defaultLocations: CreateEventTypeInput_2024_06_14["locations"] = [
      {
        type: "integration",
        integration: "cal-video",
      },
    ];

    const {
      lengthInMinutes,
      locations,
      bookingFields,
      bookingLimits,
      durationLimits,
      bookingWindow,
      ...rest
    } = inputEventType;

    const eventType = {
      ...rest,
      length: lengthInMinutes,
      locations: this.transformInputLocations(locations || defaultLocations),
      bookingFields: this.transformInputBookingFields(bookingFields),
      bookingLimits: bookingLimits ? this.transformInputIntervalLimits(bookingLimits) : undefined,
      durationLimits: durationLimits ? this.transformInputIntervalLimits(durationLimits) : undefined,
      ...(bookingWindow ? this.transformInputBookingWindow(bookingWindow) : {}),
    };

    return eventType;
  }

  transformInputUpdateEventType(inputEventType: UpdateEventTypeInput_2024_06_14) {
    const { lengthInMinutes, locations, bookingFields, scheduleId, ...rest } = inputEventType;

    const eventType = {
      ...rest,
      length: lengthInMinutes,
      locations: locations ? this.transformInputLocations(locations) : undefined,
      bookingFields: bookingFields ? this.transformInputBookingFields(bookingFields) : undefined,
      schedule: scheduleId,
    };

    return eventType;
  }

  transformInputLocations(inputLocations: CreateEventTypeInput_2024_06_14["locations"]) {
    return transformApiEventTypeLocations(inputLocations);
  }

  transformInputBookingFields(inputBookingFields: CreateEventTypeInput_2024_06_14["bookingFields"]) {
    return transformApiEventTypeBookingFields(inputBookingFields);
  }

  transformInputIntervalLimits(inputBookingFields: CreateEventTypeInput_2024_06_14["bookingLimits"]) {
    return transformApiEventTypeIntervalLimits(inputBookingFields);
  }

  transformInputBookingWindow(inputBookingWindow: CreateEventTypeInput_2024_06_14["bookingWindow"]) {
    const res = transformApiEventTypeFutureBookingLimits(inputBookingWindow);
    console.log("bbookingWindowookingWindow-ip: ", res);
    return !!res ? res : {};
  }
}
