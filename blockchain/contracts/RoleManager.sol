// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title RoleManager
 * @dev 区块链课程出勤系统的角色管理合约
 * @notice 管理教师角色的授权和验证
 */
contract RoleManager is Ownable, ReentrancyGuard {

    // 角色枚举
    enum Role { None, Teacher, Student }

    // 地址到角色的映射
    mapping(address => Role) private _roles;

    // 角色变更事件
    event RoleGranted(address indexed account, Role role);
    event RoleRevoked(address indexed account, Role role);

    /**
     * @dev 构造函数
     */
    constructor() Ownable(msg.sender) {
        // 合约部署者默认为教师
        _roles[msg.sender] = Role.Teacher;
        emit RoleGranted(msg.sender, Role.Teacher);
    }

    /**
     * @dev 授予教师角色
     * @param account 要授权的地址
     * @notice 只有合约所有者可以调用
     */
    function grantTeacherRole(address account) external onlyOwner nonReentrant {
        require(account != address(0), "Cannot grant role to zero address");
        require(_roles[account] != Role.Teacher, "Account already has teacher role");

        _roles[account] = Role.Teacher;
        emit RoleGranted(account, Role.Teacher);
    }

    /**
     * @dev 撤销教师角色
     * @param account 要撤销的地址
     * @notice 只有合约所有者可以调用
     */
    function revokeTeacherRole(address account) external onlyOwner nonReentrant {
        require(_roles[account] == Role.Teacher, "Account does not have teacher role");

        _roles[account] = Role.None;
        emit RoleRevoked(account, Role.Teacher);
    }

    /**
     * @dev 批量授予教师角色
     * @param accounts 要授权的地址数组
     * @notice 只有合约所有者可以调用
     */
    function batchGrantTeacherRole(address[] calldata accounts) external onlyOwner nonReentrant {
        for (uint256 i = 0; i < accounts.length; i++) {
            address account = accounts[i];
            if (account != address(0) && _roles[account] != Role.Teacher) {
                _roles[account] = Role.Teacher;
                emit RoleGranted(account, Role.Teacher);
            }
        }
    }

    /**
     * @dev 获取地址的角色
     * @param account 要查询的地址
     * @return 角色枚举值
     */
    function getRole(address account) external view returns (Role) {
        return _roles[account];
    }

    /**
     * @dev 检查地址是否为教师
     * @param account 要检查的地址
     * @return 是否为教师
     */
    function isTeacher(address account) external view returns (bool) {
        return _roles[account] == Role.Teacher;
    }

    /**
     * @dev 检查地址是否为学生
     * @param account 要检查的地址
     * @return 是否为学生
     */
    function isStudent(address account) external view returns (bool) {
        Role role = _roles[account];
        return role == Role.Student || role == Role.None; // 未明确设置为教师的都是学生
    }

    /**
     * @dev 获取所有教师地址
     * @return 教师地址数组
     */
    function getAllTeachers() external view returns (address[] memory) {
        // 这是一个简化的实现，实际项目中可能需要分页
        address[] memory teachers = new address[](100); // 预估大小
        uint256 count = 0;

        // 这里需要一个更好的实现方式
        // 在生产环境中，可能需要维护一个教师列表数组

        return teachers;
    }

    /**
     * @dev 获取合约信息
     */
    function getContractInfo() external view returns (
        address ownerAddress,
        uint256 teacherCount
    ) {
        address contractOwner = owner();
        return (contractOwner, 0); // teacherCount需要单独实现
    }
}
