package edu.khanh2002.chatapp.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.util.List;

@Data
public class CreateGroupRequest {

    @NotBlank(message = "Tên nhóm không được để trống")
    private String groupName;

    private Long creatorId;

    @NotNull(message = "Danh sách thành viên không được để trống")
    @Size(min = 1, message = "Nhóm phải có ít nhất 1 thành viên")
    private List<Long> memberIds;
}