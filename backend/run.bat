@echo off
set "JAVA_HOME=C:\Users\Hp\.jdks\openjdk-20.0.2"
set "MAVEN_HOME=%~dp0..\maven\apache-maven-3.9.6"
set "PATH=%JAVA_HOME%\bin;%MAVEN_HOME%\bin;%PATH%"
echo ========================================================
echo  Starting MockMate AI - Spring Boot REST API Backend
echo  API Endpoint: http://localhost:8080/api
echo ========================================================
call "%MAVEN_HOME%\bin\mvn.cmd" spring-boot:run
pause

