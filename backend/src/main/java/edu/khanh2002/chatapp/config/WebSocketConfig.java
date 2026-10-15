package edu.khanh2002.chatapp.config;

import edu.khanh2002.chatapp.websocket.UserSocket;
import org.springframework.web.socket.server.standard.ServerEndpointExporter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class WebSocketConfig {

    @Bean
    public ServerEndpointExporter serverEndpointExporter() {
        return new ServerEndpointExporter();
    }

    @Bean
    public UserSocket userSocket(JwtUtil jwtUtil) {
        UserSocket.setJwtUtil(jwtUtil);
        return new UserSocket();
    }
}
