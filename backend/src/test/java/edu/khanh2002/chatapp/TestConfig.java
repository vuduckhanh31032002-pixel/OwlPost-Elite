package edu.khanh2002.chatapp;

import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.web.socket.server.standard.ServerEndpointExporter;

@TestConfiguration
public class TestConfig {

    @Bean
    public ServerEndpointExporter disabledServerEndpointExporter() {
        return new ServerEndpointExporter();
    }
}
