/*******************************************************************************
* Header Files
*******************************************************************************/
#if defined (CY_USING_HAL)
#include "cyhal.h"
#endif
#include "cybsp.h"

/* Replace P0_0 with the actual PWM-capable GPIO pin on your board */
#define SERVO_PIN       (P9_0)
#define PWM_FREQ_HZ     (50u)       /* 20 ms period */
#define MIN_PULSE_US    (1000.0f)   /* 1.0 ms -> 0 degrees */
#define MAX_PULSE_US    (2000.0f)   /* 2.0 ms -> 180 degrees */
#define PERIOD_US       (20000.0f)  /* 20.0 ms total period */

static cyhal_pwm_t servo_pwm;

void set_servo_angle(float angle_deg)
{
    if (angle_deg < 0.0f)   angle_deg = 0.0f;
    if (angle_deg > 180.0f) angle_deg = 180.0f;

    /* Map angle (0-180) to pulse width (1000-2000 us) */
    float pulse_us = MIN_PULSE_US + (angle_deg / 180.0f) * (MAX_PULSE_US - MIN_PULSE_US);
    
    /* Convert pulse width to duty cycle percentage (5.0% to 10.0%) */
    float duty_percent = (pulse_us / PERIOD_US) * 100.0f;

    cyhal_pwm_set_duty_cycle(&servo_pwm, duty_percent, PWM_FREQ_HZ);
}

int main(void)
{
    cy_rslt_t result;

#if defined (CY_DEVICE_SECURE) && defined (CY_USING_HAL)
    cyhal_wdt_t wdt_obj;

    /* Clear watchdog timer so that it doesn't trigger a reset */
    result = cyhal_wdt_init(&wdt_obj, cyhal_wdt_get_max_timeout_ms());
    CY_ASSERT(CY_RSLT_SUCCESS == result);
    cyhal_wdt_free(&wdt_obj);
#endif

    /* Initialize the device and board peripherals */
    result = cybsp_init();

    /* Board init failed. Stop program execution */
    if (result != CY_RSLT_SUCCESS)
    {
        CY_ASSERT(0);
    }

    /* Enable global interrupts */
    __enable_irq();

	/* Initialize and start PWM on the servo signal pin */
    cyhal_pwm_init(&servo_pwm, SERVO_PIN, NULL);
    cyhal_pwm_start(&servo_pwm);

    for (;;)
    {

		set_servo_angle(0.0f);
        cyhal_system_delay_ms(1000);

        set_servo_angle(90.0f);
        cyhal_system_delay_ms(1000);

        set_servo_angle(180.0f);
        cyhal_system_delay_ms(1000);

    }
}
