FROM mcr.microsoft.com/dotnet/sdk:9.0-alpine AS build
WORKDIR /src
COPY src/MyStb.Api/MyStb.Api.csproj src/MyStb.Api/
RUN dotnet restore src/MyStb.Api/MyStb.Api.csproj
COPY . .
RUN dotnet publish src/MyStb.Api/MyStb.Api.csproj -c Release -o /app --no-restore

FROM mcr.microsoft.com/dotnet/aspnet:9.0-alpine
WORKDIR /app
COPY --from=build /app .
RUN mkdir -p /data
ENV ASPNETCORE_URLS=http://+:8080
ENV ConnectionStrings__Sqlite="Data Source=/data/mystb.db"
EXPOSE 8080
ENTRYPOINT ["dotnet", "MyStb.Api.dll"]
