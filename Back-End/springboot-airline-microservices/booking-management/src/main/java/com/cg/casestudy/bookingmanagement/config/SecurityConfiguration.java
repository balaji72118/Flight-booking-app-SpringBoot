package com.cg.casestudy.bookingmanagement.config;

import com.cg.casestudy.bookingmanagement.filter.JwtFilter;
import com.cg.casestudy.bookingmanagement.service.CustomUserDetailsService;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.AuthenticationProvider;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

@Configuration
@EnableWebSecurity
public class SecurityConfiguration {

	private final JwtFilter jwtFilter;
	private final CustomUserDetailsService userDetailsService;

	public SecurityConfiguration(JwtFilter jwtFilter, CustomUserDetailsService userDetailsService) {
		this.jwtFilter = jwtFilter;
		this.userDetailsService = userDetailsService;
	}

	// ✅ Password encoder
	@Bean
	public PasswordEncoder passwordEncoder() {
		return new BCryptPasswordEncoder();
	}

	// ✅ AuthenticationProvider (replaces AuthenticationManagerBuilder)
	@Bean
	public AuthenticationProvider authenticationProvider() {
		DaoAuthenticationProvider provider = new DaoAuthenticationProvider();
		provider.setUserDetailsService(userDetailsService);
		provider.setPasswordEncoder(passwordEncoder());
		return provider;
	}

	// ✅ AuthenticationManager (no more authenticationManagerBean override)
	@Bean
	public AuthenticationManager authenticationManager(AuthenticationConfiguration config) throws Exception {
		return config.getAuthenticationManager();
	}

	// ✅ SecurityFilterChain (replaces configure(HttpSecurity))
	@Bean
	public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
		http
				.csrf(csrf -> csrf.disable())
				.cors(cors -> {}) // enable CORS with defaults
				.authorizeHttpRequests(auth -> auth
						.requestMatchers(
								"/booking/deleteBooking",
								"/booking/allBookings"
						).hasRole("ADMIN")
						.requestMatchers(
								"/booking/getBookingsByEmail/**",
								"/booking/getFlight/**",
								"/booking/addBooking",
								"/booking/updateBooking",
								"/booking/discount"
						).hasAnyRole("ADMIN", "USER")
						.requestMatchers(
								"/booking/authenticate",
								"/v2/api-docs",
								"/v3/api-docs",
								"/swagger-resources/**",
								"/swagger-ui/**"
						).permitAll()
						.anyRequest().authenticated()
				)
				.sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS));

		// ✅ Add JWT filter
		http.addFilterBefore(jwtFilter, UsernamePasswordAuthenticationFilter.class);

		return http.build();
	}
}
