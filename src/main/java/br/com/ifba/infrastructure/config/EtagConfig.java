package br.com.ifba.infrastructure.config;

import org.springframework.boot.web.servlet.FilterRegistrationBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.filter.ShallowEtagHeaderFilter;

/** RN13: ETag nas leituras que o app mantém em cache (painel, culturas, localidades, monitor). */
@Configuration
public class EtagConfig {

    @Bean
    public FilterRegistrationBean<ShallowEtagHeaderFilter> etagFilter() {
        FilterRegistrationBean<ShallowEtagHeaderFilter> registro =
                new FilterRegistrationBean<>(new ShallowEtagHeaderFilter());
        registro.addUrlPatterns("/api/v1/localidades/*", "/api/v1/culturas", "/api/v1/culturas/*");
        registro.setName("etagFilter");
        return registro;
    }
}
