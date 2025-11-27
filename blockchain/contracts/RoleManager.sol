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

    // 教师地址列表 - 用于遍历
    address[] private _teacherList;
    // 教师地址在列表中的索引 + 1 (0表示不在列表中)
    mapping(address => uint256) private _teacherListIndex;

    // 角色变更事件
    event RoleGranted(address indexed account, Role role);
    event RoleRevoked(address indexed account, Role role);

    /**
     * @dev 构造函数
     */
    constructor() Ownable(msg.sender) {
        // 合约部署者默认为教师
        _grantTeacher(msg.sender);
    }

    /**
     * @dev 内部函数：授予教师角色
     */
    function _grantTeacher(address account) internal {
        if (_roles[account] != Role.Teacher) {
            _roles[account] = Role.Teacher;
            
            // 添加到教师列表
            if (_teacherListIndex[account] == 0) {
                _teacherList.push(account);
                _teacherListIndex[account] = _teacherList.length;
            }
            
            emit RoleGranted(account, Role.Teacher);
        }
    }

    /**
     * @dev 内部函数：撤销教师角色
     */
    function _revokeTeacher(address account) internal {
        if (_roles[account] == Role.Teacher) {
            _roles[account] = Role.None;
            
            // 从教师列表中移除 (Swap and Pop)
            uint256 index = _teacherListIndex[account];
            if (index > 0) {
                uint256 lastIndex = _teacherList.length;
                if (index != lastIndex) {
                    address lastTeacher = _teacherList[lastIndex - 1];
                    _teacherList[index - 1] = lastTeacher;
                    _teacherListIndex[lastTeacher] = index;
                }
                _teacherList.pop();
                delete _teacherListIndex[account];
            }
            
            emit RoleRevoked(account, Role.Teacher);
        }
    }

    /**
     * @dev 授予教师角色
     * @param account 要授权的地址
     * @notice 只有合约所有者可以调用
     */
    function grantTeacherRole(address account) external onlyOwner nonReentrant {
        require(account != address(0), "Cannot grant role to zero address");
        require(_roles[account] != Role.Teacher, "Account already has teacher role");
        _grantTeacher(account);
    }

    /**
     * @dev 撤销教师角色
     * @param account 要撤销的地址
     * @notice 只有合约所有者可以调用
     */
    function revokeTeacherRole(address account) external onlyOwner nonReentrant {
        require(_roles[account] == Role.Teacher, "Account does not have teacher role");
        _revokeTeacher(account);
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
                _grantTeacher(account);
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
        // 只要不是教师，就是学生 (默认角色)
        return _roles[account] != Role.Teacher;
    }

    /**
     * @dev 获取所有教师地址
     * @return 教师地址数组
     */
    function getAllTeachers() external view returns (address[] memory) {
        return _teacherList;
    }

    /**
     * @dev 获取合约信息
     */
    function getContractInfo() external view returns (
        address ownerAddress,
        uint256 teacherCount
    ) {
        return (owner(), _teacherList.length);
    }
}
