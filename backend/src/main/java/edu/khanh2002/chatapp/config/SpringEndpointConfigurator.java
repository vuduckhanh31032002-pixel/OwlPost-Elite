package edu.khanh2002.chatapp.config;

import jakarta.websocket.server.ServerEndpointConfig;
import org.springframework.context.ApplicationContext;

public class SpringEndpointConfigurator extends ServerEndpointConfig.Configurator {

    @Override
    public <T> T getEndpointInstance(Class<T> endpointClass) throws InstantiationException {
        ApplicationContext context = ApplicationContextHolder.getContext();
        if (context == null) {
            throw new IllegalStateException("ApplicationContext not initialized");
        }
        return context.getBean(endpointClass);
    }
}