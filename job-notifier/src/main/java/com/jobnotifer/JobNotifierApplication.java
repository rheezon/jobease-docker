package com.jobnotifer;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.annotation.EnableScheduling;

import java.time.ZoneOffset;
import java.util.TimeZone;

@SpringBootApplication
@EnableScheduling
@EnableAsync
public class JobNotifierApplication {

	public static void main(String[] args) {
		// Set JVM default timezone to UTC to match database timezone configuration
		TimeZone.setDefault(TimeZone.getTimeZone(ZoneOffset.UTC));
		SpringApplication.run(JobNotifierApplication.class, args);
	}

}
